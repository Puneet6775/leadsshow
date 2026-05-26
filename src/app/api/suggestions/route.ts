import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'category'; // 'category' or 'city'

  if (!query || query.length < 1) {
    return NextResponse.json([]);
  }

  try {
    let suggestions: string[] = [];
    const queryLower = query.toLowerCase();

    if (type === 'category') {
      // Get unique primary categories from leads with better matching
      const leads = await db.lead.findMany({
        where: {
          primaryCategory: {
            not: null,
          },
        },
        select: { primaryCategory: true },
        distinct: ['primaryCategory'],
        take: 1000, // Get more to filter
      });

      // Filter and score results like Google does
      const filtered = leads
        .map((l) => l.primaryCategory)
        .filter(Boolean) as string[];

      // Sort by relevance: exact prefix match first, then contains
      const scored = filtered.map((cat) => {
        const catLower = cat.toLowerCase();
        if (catLower.startsWith(queryLower)) return { cat, score: 100 };
        if (catLower.includes(queryLower)) return { cat, score: 50 };
        return { cat, score: 0 };
      });

      suggestions = scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score || a.cat.localeCompare(b.cat))
        .slice(0, 30)
        .map((s) => s.cat)
        .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

    } else if (type === 'city') {
      // Get unique cities from leads with better matching
      const leads = await db.lead.findMany({
        where: {
          city: {
            not: null,
          },
        },
        select: { city: true },
        distinct: ['city'],
        take: 1000, // Get more to filter
      });

      const filtered = leads
        .map((l) => l.city)
        .filter(Boolean) as string[];

      // Sort by relevance: exact prefix match first, then contains
      const scored = filtered.map((city) => {
        const cityLower = city.toLowerCase();
        if (cityLower.startsWith(queryLower)) return { city, score: 100 };
        if (cityLower.includes(queryLower)) return { city, score: 50 };
        return { city, score: 0 };
      });

      suggestions = scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score || a.city.localeCompare(b.city))
        .slice(0, 30)
        .map((s) => s.city)
        .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
    }

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}
