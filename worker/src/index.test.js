import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleRequest, runScheduled } from './index.js';

// In-memory KV mock.
function kv(initial) {
  const store = new Map(initial ? [['snapshot:v1', JSON.stringify(initial)]] : []);
  return { store, get: async (k) => store.get(k) ?? null, put: async (k, v) => void store.set(k, v) };
}
const KO = '2026-06-29T18:00:00Z';
const koMs = Date.parse(KO);
const schedule = { matches: { matches: [{ id: 1, utcDate: KO, status: 'TIMED' }] } };

// fetchImpl that returns a one-match live snapshot (status from `status`).
function liveFetch(status, scoreHome) {
  return async (url) => {
    const p = url.replace('https://api.football-data.org/v4', '');
    const bodies = {
      '/competitions/WC/matches': { matches: [{ id: 1, utcDate: KO, status, stage: 'GROUP_STAGE', homeTeam: { id: 9, name: 'A' }, awayTeam: { id: 8, name: 'B' }, score: { winner: null, fullTime: { home: scoreHome ?? null, away: null }, halfTime: {} } }] },
      '/competitions/WC/standings': { standings: [] },
      '/competitions/WC/scorers': { scorers: [] },
    };
    return { ok: true, status: 200, json: async () => bodies[p] };
  };
}

describe('runScheduled', () => {
  let logSpy; let errSpy;
  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { logSpy.mockRestore(); errSpy.mockRestore(); });

  it('no-ops when prior data exists and no match is in window', async () => {
    const env = { DATA: kv(schedule), FOOTBALL_DATA_API_KEY: 'k' };
    const r = await runScheduled({ env, nowMs: koMs - 60 * 60_000, fetchImpl: liveFetch('TIMED') });
    expect(r.skipped).toBe(true);
  });
  it('writes a snapshot when a match is in window', async () => {
    const env = { DATA: kv(schedule), FOOTBALL_DATA_API_KEY: 'k' };
    const r = await runScheduled({ env, nowMs: koMs + 30 * 60_000, fetchImpl: liveFetch('IN_PLAY', 1) });
    expect(r.written).toBe(true);
    const stored = JSON.parse(env.DATA.store.get('snapshot:v1'));
    expect(stored.matches.matches[0].score.home).toBe(1);
    expect(stored.at).toBe(koMs + 30 * 60_000);
  });
  it('skips the write when nothing changed', async () => {
    const env = { DATA: kv(schedule), FOOTBALL_DATA_API_KEY: 'k' };
    await runScheduled({ env, nowMs: koMs + 30 * 60_000, fetchImpl: liveFetch('IN_PLAY', 1) }); // first write
    const r = await runScheduled({ env, nowMs: koMs + 31 * 60_000, fetchImpl: liveFetch('IN_PLAY', 1) }); // same data
    expect(r.unchanged).toBe(true);
  });
  it('bootstraps when KV is empty even outside a window', async () => {
    const env = { DATA: kv(null), FOOTBALL_DATA_API_KEY: 'k' };
    const r = await runScheduled({ env, nowMs: koMs - 60 * 60_000, fetchImpl: liveFetch('TIMED') });
    expect(r.written).toBe(true);
  });
  it('keeps the prior snapshot and reports error when the upstream fetch fails in-window', async () => {
    const env = { DATA: kv(schedule), FOOTBALL_DATA_API_KEY: 'k' };
    const failing = async () => ({ ok: false, status: 500, json: async () => ({}) });
    const r = await runScheduled({ env, nowMs: koMs + 30 * 60_000, fetchImpl: failing });
    expect(r).toEqual({ skipped: true, error: true });
    expect(JSON.parse(env.DATA.store.get('snapshot:v1'))).toEqual(schedule); // prior untouched
    expect(errSpy).toHaveBeenCalled(); // failure is surfaced for observability
  });
  it('does NOT downgrade a decided knockout result back to "no winner" (NED-MAR regression)', async () => {
    // Prior already has the shootout decided (AWAY won). The feed then wobbles
    // back to winner:null with a tied/garbage fullTime — must NOT erase the winner.
    const decidedPrior = {
      matches: { matches: [{ id: 73, utcDate: KO, status: 'FINISHED', stage: 'LAST_32', home: { id: 1, name: 'A' }, away: { id: 2, name: 'B' }, score: { home: 1, away: 1, winner: 'AWAY_TEAM', shootout: true, penalties: { home: 2, away: 3 } } }] },
      standings: { groups: [], bestThirdIds: [] },
      scorers: { scorers: [] },
    };
    const wobble = async (url) => {
      const p = url.replace('https://api.football-data.org/v4', '');
      const bodies = {
        '/competitions/WC/matches': { matches: [{ id: 73, utcDate: KO, status: 'FINISHED', stage: 'LAST_32', homeTeam: { id: 1, name: 'A', tla: 'A' }, awayTeam: { id: 2, name: 'B', tla: 'B' }, score: { winner: null, duration: 'PENALTY_SHOOTOUT', fullTime: { home: 4, away: 4 }, regularTime: { home: 1, away: 1 }, extraTime: { home: 0, away: 0 }, halfTime: {} } }] },
        '/competitions/WC/standings': { standings: [] },
        '/competitions/WC/scorers': { scorers: [] },
      };
      return { ok: true, status: 200, json: async () => bodies[p] };
    };
    const env = { DATA: kv(decidedPrior), FOOTBALL_DATA_API_KEY: 'k' };
    await runScheduled({ env, nowMs: koMs + 30 * 60_000, fetchImpl: wobble }); // in window -> runs
    const m = JSON.parse(env.DATA.store.get('snapshot:v1')).matches.matches.find((x) => x.id === 73);
    expect(m.score.winner).toBe('AWAY_TEAM'); // preserved, NOT downgraded to null
  });
  it('TAKES a real score change even when the winner flag drops (a called-back goal)', async () => {
    // Prior decided 1-1 (AWAY won). The feed now reports a DIFFERENT score (a goal
    // was disallowed) — that is a real change and must overwrite, not be preserved.
    const decidedPrior = {
      matches: { matches: [{ id: 73, utcDate: KO, status: 'FINISHED', stage: 'LAST_32', home: { id: 1, name: 'A' }, away: { id: 2, name: 'B' }, score: { home: 1, away: 1, winner: 'AWAY_TEAM' } }] },
      standings: { groups: [], bestThirdIds: [] },
      scorers: { scorers: [] },
    };
    const changed = async (url) => {
      const p = url.replace('https://api.football-data.org/v4', '');
      const bodies = {
        '/competitions/WC/matches': { matches: [{ id: 73, utcDate: KO, status: 'FINISHED', stage: 'LAST_32', homeTeam: { id: 1, name: 'A', tla: 'A' }, awayTeam: { id: 2, name: 'B', tla: 'B' }, score: { winner: null, duration: 'REGULAR', fullTime: { home: 1, away: 0 }, halfTime: {} } }] },
        '/competitions/WC/standings': { standings: [] },
        '/competitions/WC/scorers': { scorers: [] },
      };
      return { ok: true, status: 200, json: async () => bodies[p] };
    };
    const env = { DATA: kv(decidedPrior), FOOTBALL_DATA_API_KEY: 'k' };
    await runScheduled({ env, nowMs: koMs + 30 * 60_000, fetchImpl: changed });
    const m = JSON.parse(env.DATA.store.get('snapshot:v1')).matches.matches.find((x) => x.id === 73);
    expect([m.score.home, m.score.away]).toEqual([1, 0]); // the corrected score, NOT the preserved 1-1
  });
});

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
