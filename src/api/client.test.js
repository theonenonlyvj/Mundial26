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

  it('canonicalizes a "LIVE" match status to IN_PLAY, leaving others untouched', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({ updatedAt: 1, stale: false, matches: [
        { id: 1, status: 'LIVE', score: { home: 2, away: 0 } },
        { id: 2, status: 'FINISHED' },
        { id: 3, status: 'TIMED' },
      ] }),
    }));
    const data = await getMatches();
    expect(data.matches.map((m) => m.status)).toEqual(['IN_PLAY', 'FINISHED', 'TIMED']);
    expect(data.matches[0].score).toEqual({ home: 2, away: 0 }); // rest of the object preserved
    expect(data.stale).toBe(false);
  });
});
