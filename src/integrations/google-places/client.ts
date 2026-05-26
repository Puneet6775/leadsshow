import { env, assertEnv } from '@/lib/env';

const BASE_URL = 'https://places.googleapis.com/v1';

export type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  primaryTypeDisplayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
};

export async function textSearchPlaces(textQuery: string) {
  assertEnv();

  const allPlaces: GooglePlace[] = [];
  let pageToken: string | undefined;
  let fetchCount = 0;
  const maxPages = 5; // Fetch up to 5 pages (20 results per page = 100 results)

  while (fetchCount < maxPages) {
    const response = await fetch(`${BASE_URL}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.googlePlacesApiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.primaryTypeDisplayName,nextPageToken',
      },
      body: JSON.stringify({
        textQuery,
        ...(pageToken ? { pageToken } : {}),
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Google Places text search failed: ${await response.text()}`);
    }

    const data = await response.json();
    if (data.places) {
      allPlaces.push(...data.places);
    }

    pageToken = data.nextPageToken;
    fetchCount += 1;

    // Stop if there are no more pages
    if (!pageToken) {
      break;
    }

    // Add a small delay to respect API rate limits
    if (fetchCount < maxPages && pageToken) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return allPlaces;
}

export async function getPlaceDetails(placeId: string): Promise<GooglePlace> {
  assertEnv();

  const response = await fetch(`${BASE_URL}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': env.googlePlacesApiKey,
      'X-Goog-FieldMask':
        'id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,googleMapsUri,rating,userRatingCount,businessStatus,primaryTypeDisplayName,location,addressComponents,regularOpeningHours',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Google Place details failed: ${await response.text()}`);
  }

  return response.json();
}