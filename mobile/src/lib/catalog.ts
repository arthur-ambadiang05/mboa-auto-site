export const SITE = 'https://mboaauto.com';
export type Vehicle = { slug: string; name: string; brand: string; year: number; type: string; fuel: string; price: number; price_display: string; location: string; specs: string; description: string; status: string; cover: string; photos: number; photo_files?: string[]; detail_url?: string };
export type Filters = { query: string; brand: string; maxPrice: number; type: string; sort: 'latest' | 'asc' | 'desc' };
const text = (s: unknown) => typeof s === 'string' ? s : '';
const filename = (s: string) => /^[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(s);
export function normalize(raw: unknown): Vehicle[] {
  if (!Array.isArray(raw)) throw new Error('Catalogue invalide');
  return raw.filter(v => v && typeof v === 'object' && /^[a-z0-9-]+$/.test(v.slug || '') && typeof v.name === 'string').map(v => ({
    slug: v.slug, name: v.name, brand: text(v.brand), year: Number(v.year) || 0, type: text(v.type), fuel: text(v.fuel), price: Math.max(0, Number(v.price) || 0), price_display: text(v.price_display), location: text(v.location), specs: text(v.specs), description: text(v.description), status: text(v.status), cover: filename(text(v.cover)) ? v.cover : '01.jpg', photos: Math.max(1, Math.min(40, Number(v.photos) || 1)), photo_files: Array.isArray(v.photo_files) ? v.photo_files.filter((s: unknown) => typeof s === 'string' && filename(s)) : undefined, detail_url: text(v.detail_url),
  }));
}
export const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function selectVehicles(vehicles: Vehicle[], f: Filters): Vehicle[] {
  const tokens = fold(f.query).split(/\s+/).filter(Boolean);
  const result = vehicles.filter(v => {
    const hay = fold([v.name, v.brand, v.specs, v.type, v.fuel, v.location].join(' '));
    return tokens.every(t => hay.includes(t) || hay.replace(/\s+/g, '').includes(t)) && (!f.brand || v.brand === f.brand) && (!f.type || v.type === f.type) && (!f.maxPrice || v.price > 0 && v.price <= f.maxPrice);
  });
  if (f.sort !== 'latest') result.sort((a, b) => !a.price && !b.price ? 0 : !a.price ? 1 : !b.price ? -1 : f.sort === 'asc' ? a.price - b.price : b.price - a.price);
  return result;
}
export function listingUrl(v: Vehicle): string {
  try { const u = new URL(v.detail_url || '/vehicules/vehicle.html?slug=' + encodeURIComponent(v.slug), SITE); if (u.origin === SITE && u.pathname.startsWith('/vehicules/')) { u.hash = ''; for (const key of [...u.searchParams.keys()]) if (key !== 'slug') u.searchParams.delete(key); return u.toString(); } } catch { /* Use safe fallback */ }
  return SITE + '/vehicules/vehicle.html?slug=' + encodeURIComponent(v.slug);
}
export const photoUrl = (v: Vehicle, file = v.cover) => SITE + '/assets/cars/' + v.slug + '/' + encodeURIComponent(filename(file) ? file : v.cover);
export const photos = (v: Vehicle) => [...new Set([v.cover, ...(v.photo_files?.length ? v.photo_files : Array.from({ length: v.photos }, (_, i) => String(i + 1).padStart(2, '0') + '.jpg'))])].map(f => photoUrl(v, f));
export const money = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';
export const whatsappUrl = (v: Vehicle) => 'https://wa.me/237691650428?text=' + encodeURIComponent('Bonjour Mboa Auto, je souhaite avoir des informations sur ' + v.name + ' affiché à ' + v.price_display + '. Est-il toujours disponible ?\nLien de l’annonce : ' + listingUrl(v));
