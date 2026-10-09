import { authenticated, json, storeFor, encrypt, validateKey, registry, processOne } from './lib/google-sync.mjs';
export function createHandler(factory = storeFor, fetcher = fetch) { return async request => {
  if (!authenticated(request)) return json(401, { error: 'Connectez-vous à votre espace privé.' });
  if (!['GET', 'POST'].includes(request.method)) return json(405, { error: 'Méthode non autorisée.' });
  if (request.method === 'POST' && request.headers.get('origin') !== 'https://mboaauto.com') return json(403, { error: 'Origine non autorisée.' });
  try {
    const store = factory();
    const config = await store.getWithMetadata('config', { type: 'json' });
    if (request.method === 'GET') {
      const vehicles = await registry(fetcher), entries = [];
      for (const vehicle of vehicles.filter(v => v.google_sync_requested === true)) {
        const entry = await store.get('vehicle/' + vehicle.slug, { type: 'json' });
        entries.push(entry || { slug: vehicle.slug, name: vehicle.name, status: vehicle.status !== 'disponible' ? 'skipped' : config?.data.enabled ? 'waiting' : 'not_connected' });
      }
      return json(200, { connected: Boolean(config?.data.encryptedKey), enabled: Boolean(config?.data.enabled), entries });
    }
    const raw = await request.text();
    if (raw.length > 4000) return json(413, { error: 'Demande trop volumineuse.' });
    const body = JSON.parse(raw);
    if (body.action === 'run') return json(200, await processOne(store, fetcher));
    if (body.action === 'retry') {
      if (!/^[a-z0-9-]+$/.test(body.slug || '')) return json(400, { error: 'Identifiant invalide.' });
      const key = 'vehicle/' + body.slug;
      const entry = await store.getWithMetadata(key, { type: 'json' });
      // Only explicit refusals can be retried safely. Unknown outcomes require
      // checking the Google listing instead of creating another post.
      if (entry?.data.status !== 'error') return json(409, { error: 'Vérifiez la publication sur Google avant toute nouvelle tentative.' });
      const saved = await store.setJSON(key, { ...entry.data, status: 'waiting', message: 'Nouvelle tentative demandée.' }, { onlyIfMatch: entry.etag });
      return saved.modified ? json(200, { success: true }) : json(409, { error: 'Le statut a changé. Actualisez la page.' });
    }
    if (body.action !== 'configure') return json(400, { error: 'Action invalide.' });
    if (typeof body.enabled !== 'boolean') return json(400, { error: 'Choisissez l’activation.' });
    let encryptedKey = config?.data.encryptedKey;
    if (body.apiKey) {
      if (typeof body.apiKey !== 'string' || body.apiKey.length > 1000 || /[\s\x00-\x1f]/.test(body.apiKey)) return json(400, { error: 'Clé invalide.' });
      try { await validateKey(body.apiKey, fetcher); } catch { return json(400, { error: 'Connexion refusée. Vérifiez la clé API Windsor, l’accès à Mboa Auto et les droits d’écriture.' }); }
      encryptedKey = encrypt(body.apiKey);
    }
    if (body.enabled && !encryptedKey) return json(400, { error: 'Renseignez la clé API Windsor pour activer la publication.' });
    const saved = await store.setJSON('config', { enabled: body.enabled, encryptedKey, updatedAt: new Date().toISOString() }, config ? { onlyIfMatch: config.etag } : { onlyIfNew: true });
    if (!saved.modified) return json(409, { error: 'La connexion a changé. Actualisez la page.' });
    return json(200, { success: true, enabled: body.enabled });
  } catch { return json(503, { error: 'Connexion Google indisponible. Réessayez plus tard.' }); }
}; }
export default createHandler();
