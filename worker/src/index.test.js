import { describe, it, expect } from 'vitest';
import { handleRequest } from './index.js';

const SNAP = {
  at: 1234,
  matches: { updatedAt: 1234, stale: false, matches: [{ id: 1 }] },
  standings: { groups: [{ group: 'GROUP_A' }], bestThirdIds: [9], updatedAt: 1234, stale: false },
  scorers: { updatedAt: 1234, stale: false, scorers: [{ name: 'Messi' }] },
  reference: { hostCities: [{ id: 'dallas' }] },
};
const get = (path) => new Request(`https://w.dev${path}`);

describe('handleRequest', () => {
  it('returns each slice with CORS + cache headers', async () => {
    const res = await handleRequest(get('/api/matches'), SNAP);
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('cache-control')).toContain('max-age=20');
    expect(await res.json()).toEqual(SNAP.matches);
  });
  it('routes standings, scorers, reference', async () => {
    expect(await (await handleRequest(get('/api/standings'), SNAP)).json()).toEqual(SNAP.standings);
    expect(await (await handleRequest(get('/api/scorers'), SNAP)).json()).toEqual(SNAP.scorers);
    expect(await (await handleRequest(get('/api/reference'), SNAP)).json()).toEqual(SNAP.reference);
  });
  it('serves empty-but-shaped payloads when the snapshot is missing', async () => {
    const res = await handleRequest(get('/api/matches'), null);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ updatedAt: null, stale: true, matches: [] });
  });
  it('404s an unknown path', async () => {
    expect((await handleRequest(get('/nope'), SNAP)).status).toBe(404);
  });
});
