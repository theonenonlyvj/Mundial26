import { describe, it, expect } from 'vitest';
import { createDataService } from './dataService.js';

describe('dataService (snapshot mode, no api key)', () => {
  const svc = createDataService({ config: { apiKey: '', ttls: { matches: 1, standings: 1, scorers: 1 } } });

  it('serves normalized matches with city resolved from venue', async () => {
    const { matches, stale } = await svc.getMatches();
    expect(stale).toBe(true);
    const m1 = matches.find((m) => m.id === 1);
    expect(m1.home.name).toBe('Mexico');
    expect(m1.city?.id).toBe('mexico-city'); // venue "Estadio Azteca" -> city
  });

  it('serves standings with advancement status + bestThirdIds', async () => {
    const { groups, bestThirdIds } = await svc.getStandings();
    const groupA = groups.find((g) => g.group === 'GROUP_A');
    expect(groupA.table[0]).toHaveProperty('status');
    expect(Array.isArray(bestThirdIds)).toBe(true);
  });
});

// Minimal payloads returned by the fake fetchImpl
const FAKE_MATCHES_PAYLOAD = {
  matches: [
    {
      id: 999,
      utcDate: '2026-06-11T00:00:00Z',
      status: 'SCHEDULED',
      stage: 'GROUP_STAGE',
      group: 'GROUP_A',
      matchday: 1,
      venue: 'Estadio Azteca',
      homeTeam: { id: 1, name: 'Mexico', shortName: 'Mexico', tla: 'MEX', crest: null },
      awayTeam: { id: 2, name: 'Canada', shortName: 'Canada', tla: 'CAN', crest: null },
      score: { fullTime: { home: null, away: null }, winner: null },
    },
  ],
};

const FAKE_STANDINGS_PAYLOAD = {
  standings: [
    {
      type: 'TOTAL',
      group: 'GROUP_A',
      table: [
        {
          position: 1,
          team: { id: 1, name: 'Mexico', shortName: 'Mexico', tla: 'MEX', crest: null },
          playedGames: 0,
          won: 0,
          draw: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        },
      ],
    },
  ],
};

const FAKE_SCORERS_PAYLOAD = { scorers: [] };

function makeFetchImpl({ ok = true, status = 200 } = {}) {
  return async (url) => {
    if (!ok) return { ok: false, status, json: async () => ({}) };
    let body;
    if (url.includes('/matches')) body = FAKE_MATCHES_PAYLOAD;
    else if (url.includes('/standings')) body = FAKE_STANDINGS_PAYLOAD;
    else body = FAKE_SCORERS_PAYLOAD;
    return { ok: true, status: 200, json: async () => body };
  };
}

describe('dataService (live API mode, injected fetchImpl)', () => {
  it('success path: getMatches returns stale:false, correct updatedAt, normalized match with city', async () => {
    const fetchImpl = makeFetchImpl();
    const svc = createDataService({
      config: { apiKey: 'KEY', ttls: { matches: 1000, standings: 1000, scorers: 1000 } },
      fetchImpl,
      now: () => 123456,
    });

    const { matches, stale, updatedAt } = await svc.getMatches();

    expect(stale).toBe(false);
    expect(updatedAt).toBe(123456);
    expect(matches).toHaveLength(1);
    const m = matches[0];
    expect(m.id).toBe(999);
    expect(m.home.name).toBe('Mexico');
    expect(m.city?.id).toBe('mexico-city'); // "Estadio Azteca" -> mexico-city
  });

  it('error path: getMatches falls back to snapshot with stale:true when fetchImpl rejects', async () => {
    const fetchImpl = async () => { throw new Error('network error'); };
    const svc = createDataService({
      config: { apiKey: 'KEY', ttls: { matches: 1000, standings: 1000, scorers: 1000 } },
      fetchImpl,
      now: () => 123456,
    });

    const { matches, stale, updatedAt } = await svc.getMatches();

    expect(stale).toBe(true);
    expect(updatedAt).toBeNull();
    // Falls back to snapshot data — should have at least one match
    expect(Array.isArray(matches)).toBe(true);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('error path: getMatches falls back to snapshot with stale:true when fetchImpl returns 500', async () => {
    const fetchImpl = makeFetchImpl({ ok: false, status: 500 });
    const svc = createDataService({
      config: { apiKey: 'KEY', ttls: { matches: 1000, standings: 1000, scorers: 1000 } },
      fetchImpl,
      now: () => 123456,
    });

    const { matches, stale, updatedAt } = await svc.getMatches();

    expect(stale).toBe(true);
    expect(updatedAt).toBeNull();
    expect(Array.isArray(matches)).toBe(true);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('transform guard: malformed live standings payload falls back to snapshot with stale:true', async () => {
    // standings is a string (not an array) — causes .filter() to throw during normalizeStandings
    const malformedStandingsPayload = { standings: 'MALFORMED' };
    const fetchImpl = async (url) => {
      if (url.includes('/standings')) {
        return { ok: true, status: 200, json: async () => malformedStandingsPayload };
      }
      return { ok: true, status: 200, json: async () => FAKE_MATCHES_PAYLOAD };
    };
    const svc = createDataService({
      config: { apiKey: 'KEY', ttls: { matches: 1000, standings: 1000, scorers: 1000 } },
      fetchImpl,
      now: () => 123456,
    });

    // Must not throw; must fall back to snapshot data with stale:true
    const result = await svc.getStandings();
    expect(result.stale).toBe(true);
    expect(result.updatedAt).toBeNull();
    expect(Array.isArray(result.groups)).toBe(true);
    expect(result.groups.length).toBeGreaterThan(0);
  });
});
