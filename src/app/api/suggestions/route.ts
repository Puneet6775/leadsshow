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
    const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase();
    const queryNorm = normalize(query);

    if (type === 'category') {
      // Fallback categories for when database is empty
      const fallbackCategories = [
        'Restaurant', 'Cafe', 'Bar', 'Hotel', 'Hospital', 'Doctor', 'Dentist',
        'Gym', 'Salon', 'Spa', 'Beauty', 'Hair Cutting', 'Skin Clinic',
        'Pharmacy', 'Shop', 'Grocery', 'Bakery', 'Clothing', 'Electronics',
        'Bank', 'ATM', 'School', 'College', 'Library', 'Park', 'Temple'
      ];

      let categories: string[] = [];

      // Try to get from database first
      try {
        const leads = await db.lead.findMany({
          where: { primaryCategory: { not: null } },
          select: { primaryCategory: true },
          distinct: ['primaryCategory'],
          take: 1000,
        });
        categories = leads.map((l) => l.primaryCategory).filter(Boolean) as string[];
      } catch (err) {
        console.error('Error fetching categories from DB:', err);
      }

      // Use fallback if no results
      if (categories.length === 0) {
        categories = fallbackCategories;
      } else {
        // Merge with fallback to ensure common items are available
        categories = [...new Set([...categories, ...fallbackCategories])];
      }

      // Score and sort by relevance
      const scored = categories.map((cat) => {
        const catNorm = normalize(cat);
        if (catNorm.startsWith(queryNorm)) return { cat, score: 100 };
        if (catNorm.includes(queryNorm)) return { cat, score: 50 };
        return { cat, score: 0 };
      });

      suggestions = scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score || a.cat.localeCompare(b.cat))
        .slice(0, 30)
        .map((s) => s.cat)
        .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

    } else if (type === 'city') {
      // Fallback cities for when database is empty
      const fallbackCities = [
        'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
        'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Indore',
        'Gurgaon', 'Noida', 'Visakhapatnam', 'Surat', 'Nagpur', 'Bhopal',
        'Shimla', 'Manali', 'Agra', 'Varanasi', 'Kochi', 'Thiruvananthapuram',
        'Coimbatore', 'Visakhapatnam', 'Vadodara', 'Ranchi', 'Patna'
      ];

      let cities: string[] = [];

      // Try to get from database first
      try {
        const leads = await db.lead.findMany({
          where: { city: { not: null } },
          select: { city: true },
          distinct: ['city'],
          take: 1000,
        });
        cities = leads.map((l) => l.city).filter(Boolean) as string[];
      } catch (err) {
        console.error('Error fetching cities from DB:', err);
      }

      // Use fallback if no results
      if (cities.length === 0) {
        cities = fallbackCities;
      } else {
        // Merge with fallback to ensure common items are available
        cities = [...new Set([...cities, ...fallbackCities])];
      }

      // Score and sort by relevance
      const scored = cities.map((city) => {
        const cityNorm = normalize(city);
        if (cityNorm.startsWith(queryNorm)) return { city, score: 100 };
        if (cityNorm.includes(queryNorm)) return { city, score: 50 };
        return { city, score: 0 };
      });

      suggestions = scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score || a.city.localeCompare(b.city))
        .slice(0, 30)
        .map((s) => s.city)
        .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
    } else if (type === 'state') {
      // Static list of Indian states and union territories for reliable suggestions
      const indianStates = [
        'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
      ];

      const scored = indianStates.map((s) => ({ state: s, score: normalize(s).startsWith(queryNorm) ? 100 : (normalize(s).includes(queryNorm) ? 50 : 0) }));

      suggestions = scored.filter((s) => s.score > 0).sort((a,b) => b.score - a.score || a.state.localeCompare(b.state)).slice(0,30).map((s) => s.state);
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
