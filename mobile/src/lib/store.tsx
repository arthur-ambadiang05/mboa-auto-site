import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalize, SITE, Vehicle } from './catalog';
const CACHE = 'mboa.catalog.v1', FAVORITES = 'mboa.favorites.v1';
type State = { vehicles: Vehicle[]; favorites: string[]; busy: boolean; stale: boolean; error: string; storageError: string; updated: string; refresh: () => Promise<void>; toggle: (slug: string) => void; ready: boolean };
const Context = createContext<State | null>(null);
export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]), [favorites, setFavorites] = useState<string[]>([]), [busy, setBusy] = useState(true), [stale, setStale] = useState(false), [error, setError] = useState(''), [storageError, setStorageError] = useState(''), [updated, setUpdated] = useState(''), [ready, setReady] = useState(false);
  const mounted = useRef(true), running = useRef(false), saveQueue = useRef(Promise.resolve());
  const refresh = useCallback(async () => {
    if (running.current) return; running.current = true; setBusy(true);
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
    try { const r = await fetch(SITE + '/data/vehicules.json', { cache: 'no-store', signal: controller.signal }); if (!r.ok) throw Error('Catalogue indisponible'); const data = normalize(await r.json()); const date = new Date().toISOString(); if (mounted.current) { setVehicles(data); setUpdated(date); setStale(false); setError(''); } try { await AsyncStorage.setItem(CACHE, JSON.stringify({ vehicles: data, updated: date })); } catch { if (mounted.current) setStorageError('Le catalogue ne peut pas être gardé hors connexion sur cet appareil.'); } }
    catch { if (mounted.current) { setStale(true); setError('Connexion au catalogue impossible. Réessayez ; la disponibilité doit être confirmée.'); } }
    finally { clearTimeout(timer); running.current = false; if (mounted.current) setBusy(false); }
  }, []);
  useEffect(() => { mounted.current = true; (async () => { try { const [c, f] = await Promise.all([AsyncStorage.getItem(CACHE), AsyncStorage.getItem(FAVORITES)]); if (!mounted.current) return; if (c) { try { const saved = JSON.parse(c); setVehicles(normalize(saved.vehicles)); setUpdated(saved.updated || ''); setStale(true); } catch { /* Ignore invalid cache */ } } if (f) { try { const saved = JSON.parse(f); if (Array.isArray(saved)) setFavorites(saved.filter(s => typeof s === 'string' && /^[a-z0-9-]+$/.test(s))); } catch { /* Ignore invalid favorites */ } } } catch { if (mounted.current) setStorageError('Les favoris ne peuvent pas être récupérés sur cet appareil.'); } finally { if (mounted.current) { setReady(true); await refresh(); } } })(); return () => { mounted.current = false; }; }, [refresh]);
  const toggle = (slug: string) => { if (!ready) return; setFavorites(previous => { const next = previous.includes(slug) ? previous.filter(x => x !== slug) : [...previous, slug]; saveQueue.current = saveQueue.current.then(() => AsyncStorage.setItem(FAVORITES, JSON.stringify(next))).catch(() => { if (mounted.current) setStorageError('Vos favoris n’ont pas pu être sauvegardés.'); }); return next; }); };
  return <Context.Provider value={{ vehicles, favorites, busy, stale, error, storageError, updated, refresh, toggle, ready }}>{children}</Context.Provider>;
}
export function useCatalog() { const value = useContext(Context); if (!value) throw Error('Catalogue manquant'); return value; }
