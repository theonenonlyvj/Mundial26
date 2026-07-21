import { useEffect, useState } from 'react';
import { readCache, writeCache } from '../api/dataCache.js';
import { getSeed } from '../data/seed.js';
import { ARCHIVE_ACTIVE } from '../archive.js';

// Cache-first data loading: seed state synchronously from the last cached result
// (so the page paints immediately on first visit), then fetch fresh in the
// background and update + re-cache. `dataAsOf` is when the shown data was last
// successfully loaded.
export function useLiveData(key, fetcher, { refreshMs } = {}) {
  // ARCHIVE MODE: the bundled FINAL snapshot beats any visitor's cached copy —
  // a returning visitor's localStorage may be frozen mid-tournament, which is
  // older than the archive. (The tick below still runs once; it resolves from
  // the same bundled data via client.js and overwrites the stale cache.)
  // Live mode: prefer the visitor's cache, fall back to the bundled snapshot,
  // so the page is never blank on a first visit.
  const initial = () => (ARCHIVE_ACTIVE
    ? getSeed(key) ?? readCache(key)
    : readCache(key) ?? getSeed(key));
  const [data, setData] = useState(() => initial()?.data ?? null);
  const [dataAsOf, setDataAsOf] = useState(() => initial()?.at ?? null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    let timer = null;
    const tick = () => Promise.resolve().then(fetcher).then((fresh) => {
      if (!active) return;
      setError(null);
      writeCache(key, fresh);
      setData(fresh);
      setDataAsOf(Date.now());
    }).catch((e) => { if (active) setError(e?.message ?? String(e)); });
    tick();
    // No polling in archive mode — the data can never change again.
    if (refreshMs && !ARCHIVE_ACTIVE) timer = setInterval(tick, refreshMs);
    return () => { active = false; if (timer) clearInterval(timer); };
    // Intentionally keyed only on `key` and `refreshMs`; `fetcher` is a fresh closure each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refreshMs]);

  return { data, dataAsOf, error };
}
