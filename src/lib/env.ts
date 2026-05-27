export const env = {
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
};

export function assertEnv() {
  const missing: string[] = [];

  if (!env.googlePlacesApiKey) {
    missing.push('GOOGLE_PLACES_API_KEY');
  }
  if (!env.databaseUrl) {
    missing.push('DATABASE_URL');
  }

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}