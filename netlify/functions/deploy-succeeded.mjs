import { processOne } from './lib/google-sync.mjs';
// Netlify verifies platform event signatures before invoking this function.
// Always verify the public production catalogue before publishing to Google.
export default async () => {
  try { await processOne(); } catch { console.error('Google publication after deployment unavailable'); }
  return new Response(null, { status: 204 });
};
