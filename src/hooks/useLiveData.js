import { useEffect, useState } from 'react';
import { readCache, writeCache } from '../api/dataCache.js';
import { getSeed } from '../data/seed.js';

// Cache-first data loading: seed state synchronously from the last cached result
// (so the page paints real content immediately, even while the API cold-starts),
// then fetch fresh in the background and update + re-cache. `dataAsOf` is when the
// shown data was last successfully loaded.
export function useLiveData(key, fetcher) {
  // Prefer this visitor's cached copy; otherwise fall back to the bundled
  // snapshot so the page is never blank on a first visit.
  const initial = () => readCache(key) ?? getSeed(key);
  const [data, setData] = useState(() => initial()?.data ?? null);
  const [dataAsOf, setDataAsOf] = useState(() => initial()?.at ?? null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(fetcher)
      .then((fresh) => {
        if (!active) return;
        setData(fresh);
        writeCache(key, fresh);
        setDataAsOf(Date.now());
        setError(null);
      })
      .catch((e) => { if (active) setError(e?.message ?? String(e)); });
    return () => { active = false; };
    // Intentionally keyed only on `key`; `fetcher` is a fresh closure each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, dataAsOf, error };
}
