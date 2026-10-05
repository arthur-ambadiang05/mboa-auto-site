import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
const statuses = ['nouveau', 'contacte', 'rendez-vous', 'gagne', 'perdu'];
const reply = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
function authenticated(event) {
  const secret = process.env.MBOA_ADMIN_SESSION_SECRET;
  const cookie = (event.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('mboa_admin_session='));
  if (!secret || !cookie) return false;
  const [expires, signature, extra] = cookie.slice('mboa_admin_session='.length).split('.');
  if (extra || !expires || !/^[a-f0-9]{64}$/.test(signature || "") || !Number.isFinite(Number(expires)) || Number(expires) <= Date.now() / 1000) return false;
  const expected = crypto.createHmac('sha256', secret).update(expires).digest('hex');
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
function clean(input) {
  const result = {};
  for (const [key, max] of Object.entries({ name: 120, phone: 30, vehicle: 160, budget: 40, notes: 3000 })) {
    if (typeof input[key] !== 'string' || input[key].length > max) throw new Error('Champ invalide : ' + key);
    result[key] = input[key].trim();
  }
  if (!result.name) throw new Error('Renseignez le nom du client.');
  if (result.phone && !/^\+?[\d\s().-]{6,30}$/.test(result.phone)) throw new Error('Numéro de téléphone invalide.');
  if (!statuses.includes(input.status)) throw new Error('Statut invalide.');
  result.status = input.status;
  for (const key of ['followUp', 'appointment']) {
    if (typeof input[key] !== 'string' || (input[key] && (!Number.isFinite(Date.parse(input[key])) || input[key].length > 30))) throw new Error('Date invalide.');
    result[key] = input[key] ? new Date(input[key]).toISOString() : '';
  }
  return result;
}
export function createHandler(storeFactory = getStore) { return async request => {
  const event = { httpMethod: request.method, headers: Object.fromEntries(request.headers), body: "" };
  if (!authenticated(event)) return reply(401, { error: 'Connectez-vous à votre espace privé.' });
  if (!['GET', 'POST'].includes(event.httpMethod)) return reply(405, { error: 'Méthode non autorisée.' });
  if (event.httpMethod === 'POST' && event.headers.origin && event.headers.origin !== 'https://mboaauto.com') return reply(403, { error: 'Origine non autorisée.' });
  try {
    const store = storeFactory({ name: 'mboa-auto-clients', consistency: 'strong' });
    if (event.httpMethod === 'GET') {
      const { blobs } = await store.list({ prefix: 'client/' });
      const clients = [];
      for (let i = 0; i < blobs.length; i += 20) {
        const batch = await Promise.all(blobs.slice(i, i + 20).map(async blob => {
          const entry = await store.getWithMetadata(blob.key, { type: 'json' });
          return entry ? { ...entry.data, revision: entry.etag } : null;
        }));
        clients.push(...batch.filter(Boolean));
      }
      return reply(200, { clients });
    }
    event.body = await request.text();
    if ((event.body || '').length > 15000) return reply(413, { error: 'Demande trop volumineuse.' });
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'Demande invalide.' }); }
    let data;
    try { data = clean(body.client || {}); } catch (e) { return reply(400, { error: e.message }); }
    const id = body.id || crypto.randomUUID();
    if (!/^[a-f0-9-]{36}$/.test(id)) return reply(400, { error: 'Identifiant invalide.' });
    const key = 'client/' + id;
    const old = await store.getWithMetadata(key, { type: 'json' });
    if (body.id && !old) return reply(404, { error: 'Client introuvable.' });
    if (old && (!body.revision || body.revision !== old.etag)) return reply(409, { error: 'Cette fiche a changé. Actualisez la liste avant de la modifier.' });
    const client = { ...data, id, createdAt: old ? old.data.createdAt : new Date().toISOString(), updatedAt: new Date().toISOString(), writeId: crypto.randomUUID() };
    const saved = await store.setJSON(key, client, old ? { onlyIfMatch: old.etag } : { onlyIfNew: true });
    if (!saved.modified) return reply(409, { error: 'Une autre modification a eu lieu. Actualisez la liste.' });
    const verified = await store.getWithMetadata(key, { type: 'json' });
    if (!verified || verified.data.writeId !== client.writeId) return reply(503, { error: 'Enregistrement non confirmé. Actualisez la liste avant de réessayer.' });
    return reply(200, { client: { ...verified.data, revision: verified.etag } });
  } catch (e) {
    console.error('CRM storage error:', e.name);
    return reply(503, { error: 'Le carnet clients est indisponible. Vos changements ne sont pas confirmés ; réessayez plus tard.' });
  }
}; }
export default createHandler();
