import { processOne } from './lib/google-sync.mjs';
export default async () => {
  try { await processOne(); } catch { console.error('Google synchronization unavailable'); }
  return new Response(null, { status: 204 });
};
export const config = { schedule: '* * * * *' };
