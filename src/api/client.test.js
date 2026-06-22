import { describe, it, expect, vi, afterEach } from 'vitest';
import { getMatches } from './client.js';

afterEach(() => vi.restoreAllMocks());

describe('api client', () => {
  it('fetches /api/matches and returns json', async () => {
    vi.stubGlobal('fetch', async (url) => ({
      ok: true, json: async () => ({ url, matches: [] }),
    }));
    const data = await getMatches();
    expect(data.url).toBe('/api/matches');
  });

  it('uses a same-origin path when VITE_API_URL is unset (dev/test default)', async () => {
    let called;
    vi.stubGlobal('fetch', async (url) => {
      called = url;
      return { ok: true, json: async () => ({}) };
    });
    await getMatches();
    expect(called).toBe('/api/matches');
  });
});
