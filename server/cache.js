export function createCache({ now = () => Date.now() } = {}) {
  const store = new Map(); // key -> { value, expiresAt }
  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return { hit: false, stale: false, value: undefined };
      return { hit: true, stale: now() >= entry.expiresAt, value: entry.value };
    },
    set(key, value, ttlMs) {
      store.set(key, { value, expiresAt: now() + ttlMs });
    },
  };
}

export function createCachedFetcher({ cache, fetcher, ttlMs, now }) {  // now is accepted per spec; clock is injected via cache
  return async function cachedFetch(key) {
    const cached = cache.get(key);
    if (cached.hit && !cached.stale) {
      return { value: cached.value, fromCache: true, stale: false };
    }
    try {
      const value = await fetcher(key);
      cache.set(key, value, ttlMs);
      return { value, fromCache: false, stale: false };
    } catch (error) {
      if (cached.hit) {
        return { value: cached.value, fromCache: true, stale: true, error };
      }
      throw error;
    }
  };
}
