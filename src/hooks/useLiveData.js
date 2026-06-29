import { useEffect, useState } from 'react';
import { readCache, writeCache } from '../api/dataCache.js';
import { getSeed } from '../data/seed.js';

// Cache-first data loading: seed state synchronously from the last cached result
// (so the page paints immediately on first visit), then fetch fresh in the
// background and update + re-cache. `dataAsOf` is when the shown data was last
// successfully loaded.
export function useLiveData(key, fetcher, { refreshMs } = {}) {
  // Prefer this visitor's cached copy; otherwise fall back to the bundled
  // snapshot so the page is never blank on a first visit.
  const initial = () => readCache(key) ?? getSeed(key);
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
    if (refreshMs) timer = setInterval(tick, refreshMs);
    return () => { active = false; if (timer) clearInterval(timer); };
    // Intentionally keyed only on `key` and `refreshMs`; `fetcher` is a fresh closure each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refreshMs]);

  return { data, dataAsOf, error };
}
