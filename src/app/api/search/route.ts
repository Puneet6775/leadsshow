import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { textSearchPlaces, getPlaceDetails } from '@/integrations/google-places/client';
import { mapGooglePlaceToLead } from '@/lib/mappers';

const schema = z.object({
  category: z.string().min(2),
  city: z.string().min(2),
  state: z.string().optional(),
  country: z.string().default('India'),
  page: z.coerce.number().int().positive().default(1).optional(),
});

const RESULTS_PER_PAGE = 10000; // Increased to show all results without strict pagination

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = schema.parse(body);

    const textQuery = [
      input.category,
      'in',
      input.city,
      input.state,
      input.country,
    ]
      .filter(Boolean)
      .join(' ');

    const searchJob = await db.searchJob.create({
      data: {
        category: input.category,
        city: input.city,
        state: input.state,
        country: input.country,
        keyword: textQuery,
        status: 'RUNNING',
      },
    });

    const places = await textSearchPlaces(textQuery);
    let saved = 0;

    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      if (!place.id) continue;

      const details = await getPlaceDetails(place.id);
      const mapped = mapGooglePlaceToLead(details);

      if (!mapped.externalPlaceId) continue;

      // Replace upsert with find -> update/create to avoid implicit transactions
      let lead = await db.lead.findUnique({
        where: { externalPlaceId: mapped.externalPlaceId },
      });

      if (lead) {
        lead = await db.lead.update({
          where: { id: lead.id },
          data: mapped,
        });
      } else {
        lead = await db.lead.create({
          data: mapped,
        });
      }

      // SearchResult upsert replacement: try to find then update or create
      const existingResult = await db.searchResult.findFirst({
        where: {
          searchJobId: searchJob.id,
          leadId: lead.id,
        },
      });

      if (existingResult) {
        await db.searchResult.update({
          where: { id: existingResult.id },
          data: {
            rank: i + 1,
            queryText: textQuery,
            rawPayload: details,
          },
        });
      } else {
        await db.searchResult.create({
          data: {
            searchJobId: searchJob.id,
            leadId: lead.id,
            rank: i + 1,
            queryText: textQuery,
            rawPayload: details,
          },
        });
      }

      saved += 1;
    }

    await db.searchJob.update({
      where: { id: searchJob.id },
      data: {
        totalFound: places.length,
        totalSaved: saved,
        status: 'COMPLETED',
      },
    });

    const leads = await db.lead.findMany({
      where: {
        searchResults: {
          some: {
            searchJobId: searchJob.id,
          },
        },
      },
      orderBy: [{ leadScore: 'desc' }, { createdAt: 'desc' }],
    });

    // Get pagination info
    const page = input.page || 1;
    const skip = (page - 1) * RESULTS_PER_PAGE;
    const paginatedLeads = leads.slice(skip, skip + RESULTS_PER_PAGE);

    return NextResponse.json({
      searchJobId: searchJob.id,
      totalFound: places.length,
      totalSaved: saved,
      total: leads.length,
      page,
      pageSize: RESULTS_PER_PAGE,
      leads: paginatedLeads,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}