import { describe, it, expect } from 'vitest';
import { createCache, createCachedFetcher } from './cache.js';

describe('createCache', () => {
  it('returns fresh then stale as time passes', () => {
    let t = 0;
    const cache = createCache({ now: () => t });
    cache.set('k', 'v', 100);
    expect(cache.get('k')).toMatchObject({ hit: true, stale: false, value: 'v' });
    t = 150;
    expect(cache.get('k')).toMatchObject({ hit: true, stale: true, value: 'v' });
  });
});

describe('createCachedFetcher', () => {
  it('serves last-good value when the fetcher throws', async () => {
    let t = 0;
    const cache = createCache({ now: () => t });
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      if (calls === 1) return 'fresh';
      throw new Error('upstream down');
    };
    const cachedFetch = createCachedFetcher({ cache, fetcher, ttlMs: 100, now: () => t });

    expect(await cachedFetch('k')).toMatchObject({ value: 'fresh', stale: false });
    t = 200; // expire
    const res = await cachedFetch('k');
    expect(res).toMatchObject({ value: 'fresh', stale: true });
    expect(res.error).toBeInstanceOf(Error);
  });
});
