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

      const lead = await db.lead.upsert({
        where: { externalPlaceId: mapped.externalPlaceId },
        update: mapped,
        create: mapped,
      });

      await db.searchResult.upsert({
        where: {
          searchJobId_leadId: {
            searchJobId: searchJob.id,
            leadId: lead.id,
          },
        },
        update: {
          rank: i + 1,
          queryText: textQuery,
          rawPayload: details,
        },
        create: {
          searchJobId: searchJob.id,
          leadId: lead.id,
          rank: i + 1,
          queryText: textQuery,
          rawPayload: details,
        },
      });

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