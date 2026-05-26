import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || undefined;
  const category = searchParams.get('category') || undefined;

  const leads = await db.lead.findMany({
    where: {
      ...(city ? { city } : {}),
      ...(category ? { primaryCategory: category } : {}),
    },
    orderBy: [{ leadScore: 'desc' }, { createdAt: 'desc' }],
    take: 500,
  });

  return NextResponse.json({ leads });
}