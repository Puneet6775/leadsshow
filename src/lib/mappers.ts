import type { GooglePlace } from '@/integrations/google-places/client';
import { leadScore } from '@/lib/utils';

function getAddressPart(place: GooglePlace, type: string) {
  return (
    place.addressComponents?.find((part) => part.types?.includes(type))?.longText ||
    null
  );
}

export function mapGooglePlaceToLead(place: GooglePlace) {
  const phone = place.internationalPhoneNumber || place.nationalPhoneNumber || null;
  const hasWebsite = Boolean(place.websiteUri);
  const hasPhone = Boolean(phone);

  return {
    externalPlaceId: place.id || null,
    source: 'GOOGLE_PLACES' as const,
    businessName: place.displayName?.text || 'Unknown Business',
    primaryCategory: place.primaryTypeDisplayName?.text || null,
    phonePrimary: phone,
    websiteUrl: place.websiteUri || null,
    googleMapsUrl: place.googleMapsUri || null,
    addressLine1: place.formattedAddress || null,
    city:
      getAddressPart(place, 'locality') ||
      getAddressPart(place, 'administrative_area_level_2'),
    state: getAddressPart(place, 'administrative_area_level_1'),
    postalCode: getAddressPart(place, 'postal_code'),
    country: getAddressPart(place, 'country'),
    latitude: place.location?.latitude || null,
    longitude: place.location?.longitude || null,
    rating: place.rating || null,
    reviewCount: place.userRatingCount || null,
    businessStatus: place.businessStatus || null,
    openingHoursJson: place.regularOpeningHours?.weekdayDescriptions || null,
    hasWebsite,
    hasPhone,
    leadScore: leadScore({
      hasPhone,
      hasWebsite,
      reviewCount: place.userRatingCount,
      rating: place.rating,
    }),
  };
}