import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

export const LOCATION = 'locations/4649832843426570918';
export const SITE = 'https://mboaauto.com';
export const storeFor = () => getStore({ name: 'mboa-google-publications', consistency: 'strong' });
const registryUrl = 'https://api.github.com/repos/arthur-ambadiang05/mboa-auto-site/contents/data/vehicules.json?ref=main';
export const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export function authenticated(request) {
  const cookie = request.headers.get('cookie') || '';
  const session = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('mboa_admin_session='));
  const secret = process.env.MBOA_ADMIN_SESSION_SECRET;
  if (!session || !secret) return false;
  const [expires, signature, extra] = session.slice('mboa_admin_session='.length).split('.');
  if (extra || !/^\d+$/.test(expires || '') || !/^[a-f0-9]{64}$/.test(signature || '') || Number(expires) <= Date.now() / 1000) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(crypto.createHmac('sha256', secret).update(expires).digest('hex')));
}
function encryptionKey() {
  if (!process.env.MBOA_ADMIN_SESSION_SECRET) throw Error('Configuration serveur absente');
  return Buffer.from(crypto.hkdfSync('sha256', process.env.MBOA_ADMIN_SESSION_SECRET, 'mboa-google', 'windsor-key-v1', 32));
}
export function encrypt(key) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  return { iv: iv.toString('base64'), data: Buffer.concat([cipher.update(key, 'utf8'), cipher.final()]).toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}
export function decrypt(encrypted) {
  const cipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(encrypted.iv, 'base64'));
  cipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
  return Buffer.concat([cipher.update(Buffer.from(encrypted.data, 'base64')), cipher.final()]).toString('utf8');
}
export async function registry(fetcher = fetch) {
  const response = await fetcher(registryUrl, { headers: { Authorization: `Bearer ${process.env.MBOA_GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Mboa-Google-Sync' }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw Error('Stock indisponible');
  const file = await response.json();
  const vehicles = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
  if (!Array.isArray(vehicles)) throw Error('Stock invalide');
  return vehicles;
}
export async function validateKey(key, fetcher = fetch) {
  const url = new URL('https://connectors.windsor.ai/google_my_business/actions');
  url.searchParams.set('api_key', key);
  const response = await fetcher(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Error('Connexion Windsor refusée. Vérifiez la clé et les droits d’écriture.');
  const data = await response.json();
  const actions = Array.isArray(data) ? data : data.result;
  if (!Array.isArray(actions) || !actions.some(a => a.id === 'create_local_post')) throw Error('Publication Google indisponible pour cette connexion.');
  const accountUrl = new URL('https://connectors.windsor.ai/google_my_business');
  accountUrl.searchParams.set('api_key', key);
  accountUrl.searchParams.set('fields', 'account_id,location_id');
  accountUrl.searchParams.set('select_accounts', LOCATION);
  const accountResponse = await fetcher(accountUrl, { signal: AbortSignal.timeout(10000) });
  if (!accountResponse.ok) throw Error('La fiche Google Mboa Auto est inaccessible avec cette clé.');
  const accountData = await accountResponse.json();
  const rows = Array.isArray(accountData) ? accountData : accountData.data;
  if (!Array.isArray(rows) || !rows.some(r => r.account_id === LOCATION || r.location_id === LOCATION)) throw Error('Cette connexion ne contient pas la fiche Mboa Auto attendue.');
}
export function postFor(vehicle) {
  if (!/^[a-z0-9-]+$/.test(vehicle.slug) || !/^[a-zA-Z0-9_.-]+\.(jpg|jpeg|png)$/i.test(vehicle.cover || '')) throw Error('Photo ou identifiant invalide');
  const price = Number(vehicle.price);
  if (!Number.isFinite(price) || price <= 0) throw Error('Prix invalide');
  const summary = `${vehicle.name} ${vehicle.year} à vendre chez Mboa Auto.\n\n${vehicle.fuel} • ${vehicle.type}\nPrix : ${new Intl.NumberFormat('fr-FR').format(price)} FCFA\nLocalisation : ${vehicle.location}\n\nConsultez la fiche pour les photos et les caractéristiques. Contactez Mboa Auto pour confirmer la disponibilité et organiser une visite sur rendez-vous.`.slice(0, 1500);
  return { language_code: 'fr', summary, photo_url: `${SITE}/assets/cars/${vehicle.slug}/${vehicle.cover}`, cta_type: 'LEARN_MORE', cta_url: `${SITE}/vehicules/${vehicle.slug}.html` };
}
// One publication per unique vehicle. Claim before calling the external service;
// uncertain replies never retry automatically, since the post may already exist.
export async function processOne(store = storeFor(), fetcher = fetch) {
  const config = await store.get('config', { type: 'json' });
  if (!config?.enabled || !config.encryptedKey) return { status: 'not_connected' };
  const vehicles = await registry(fetcher);
  for (const vehicle of vehicles.filter(v => v.google_sync_requested === true)) {
    const key = 'vehicle/' + vehicle.slug;
    const old = await store.getWithMetadata(key, { type: 'json' });
    if (old && old.data.status !== 'waiting') continue;
    if (vehicle.status !== 'disponible') continue;
    let params;
    try { params = postFor(vehicle); } catch { continue; }
    const liveResponse = await fetcher(`${SITE}/data/vehicules.json`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (!liveResponse.ok) return { status: 'waiting' };
    const live = await liveResponse.json();
    const current = live.find(v => v.slug === vehicle.slug);
    if (!current || current.status !== 'disponible' || current.price !== vehicle.price || current.cover !== vehicle.cover) return { status: 'waiting' };
    const photo = await fetcher(params.photo_url, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
    const page = await fetcher(params.cta_url, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
    if (!photo.ok || !/^image\//i.test(photo.headers.get('content-type') || '') || !page.ok) return { status: 'waiting' };
    const claim = { slug: vehicle.slug, name: vehicle.name, status: 'sending', attemptedAt: new Date().toISOString(), writeId: crypto.randomUUID(), url: params.cta_url };
    const saved = await store.setJSON(key, claim, old ? { onlyIfMatch: old.etag } : { onlyIfNew: true });
    if (!saved.modified) continue;
    const confirmed = await store.getWithMetadata(key, { type: 'json' });
    if (!confirmed || confirmed.data.writeId !== claim.writeId) return { status: 'waiting' };
    let result = { ...claim, status: 'needs_review', message: 'Envoi non confirmé. Vérifiez les actualités Google avant de réessayer.' };
    try {
      const url = new URL('https://connectors.windsor.ai/google_my_business/actions');
      url.searchParams.set('api_key', decrypt(config.encryptedKey));
      const response = await fetcher(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account: LOCATION, action: 'create_local_post', params }), signal: AbortSignal.timeout(12000) });
      const data = await response.json();
      if (response.ok && !data.error && data.isError !== true && data.result) result = { ...claim, status: 'sent', sentAt: new Date().toISOString(), message: 'Envoyé à Google. L’affichage dépend de son examen.' };
      else if (response.status >= 400 && response.status < 500) result = { ...claim, status: 'error', message: 'Envoi refusé. Vérifiez la connexion Windsor et les droits de publication.' };
    } catch { /* Do not log credential-bearing request URLs or auto-retry. */ }
    await store.setJSON(key, result, { onlyIfMatch: confirmed.etag });
    return { status: result.status, slug: vehicle.slug };
  }
  return { status: 'idle' };
}
