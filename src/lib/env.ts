export const env = {
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
};

export function assertEnv() {
  if (!env.googlePlacesApiKey) {
    throw new Error('Missing GOOGLE_PLACES_API_KEY in environment variables.');
  }
}