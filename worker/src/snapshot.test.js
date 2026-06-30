import { describe, it, expect } from 'vitest';
import { inGameWindow, buildSnapshot } from './snapshot.js';

// Minimal fake football-data v4 responses (raw upstream shapes).
function fakeFetch(rawByPath) {
  return async (url) => {
    const path = url.replace('https://api.football-data.org/v4', '');
    const body = rawByPath[path];
    return { ok: body !== undefined, status: body ? 200 : 404, json: async () => body };
  };
}

const RAW = {
  '/competitions/WC/matches': {
    matches: [{
      id: 537417, utcDate: '2026-06-28T19:00:00Z', status: 'TIMED', stage: 'LAST_32',
      group: null, matchday: null, venue: null,
      homeTeam: { id: 774, name: 'South Africa', tla: 'RSA', crest: 'rsa.png' },
      awayTeam: { id: 828, name: 'Canada', tla: 'CAN', crest: 'can.png' },
      score: { winner: null, fullTime: { home: null, away: null }, halfTime: { home: null, away: null } },
    }],
  },
  '/competitions/WC/standings': {
    standings: [{
      type: 'TOTAL', group: 'GROUP_A',
      table: [{ position: 1, team: { id: 769, name: 'Mexico', tla: 'MEX' }, playedGames: 3, won: 3, draw: 0, lost: 0, goalsFor: 6, goalsAgainst: 1, goalDifference: 5, points: 9 }],
    }],
  },
  '/competitions/WC/scorers': {
    scorers: [{ player: { name: 'Lionel Messi', nationality: 'Argentina' }, team: { id: 1, name: 'Argentina', tla: 'ARG', crest: 'arg.png' }, goals: 5 }],
  },
};

describe('buildSnapshot', () => {
  it('returns the SPA-shaped bundle with city + channels attached', async () => {
    const snap = await buildSnapshot({ apiKey: 'k', fetchImpl: fakeFetch(RAW), now: () => 1_000 });
    // matches slice
    expect(snap.matches.stale).toBe(false);
    expect(snap.matches.updatedAt).toBe(1_000);
    expect(snap.matches.matches).toHaveLength(1);
    const m = snap.matches.matches[0];
    expect(m.home.name).toBe('South Africa');
    expect(m.city?.id).toBe('los-angeles'); // match 537417 -> LA (matchVenues map)
    expect(m.channels).toBeTruthy();
    // standings slice
    expect(snap.standings.groups[0].table[0].team.name).toBe('Mexico');
    expect(Array.isArray(snap.standings.bestThirdIds)).toBe(true);
    // scorers + reference
    expect(snap.scorers.scorers[0].name).toBe('Lionel Messi');
    expect(snap.reference.hostCities.length).toBeGreaterThan(0);
  });

  it('rejects when an upstream fetch fails (so the cron keeps the prior snapshot)', async () => {
    await expect(buildSnapshot({ apiKey: 'k', fetchImpl: fakeFetch({}) })).rejects.toThrow();
  });
});

const KO = '2026-06-29T18:00:00Z';
const koMs = Date.parse(KO);

describe('inGameWindow', () => {
  it('is true within [kickoff-12min, kickoff+240min] for an unfinished match', () => {
    expect(inGameWindow([{ utcDate: KO, status: 'TIMED' }], koMs - 10 * 60_000)).toBe(true); // imminent
    expect(inGameWindow([{ utcDate: KO, status: 'IN_PLAY' }], koMs + 60 * 60_000)).toBe(true); // live
  });
  it('is false before the lead window and long after kickoff', () => {
    expect(inGameWindow([{ utcDate: KO, status: 'TIMED' }], koMs - 30 * 60_000)).toBe(false);
    expect(inGameWindow([{ utcDate: KO, status: 'TIMED' }], koMs + 300 * 60_000)).toBe(false);
  });
  it('KEEPS refreshing a finished/awarded match still inside the time window (to catch late corrections)', () => {
    expect(inGameWindow([{ utcDate: KO, status: 'FINISHED' }], koMs + 60 * 60_000)).toBe(true);
    expect(inGameWindow([{ utcDate: KO, status: 'AWARDED' }], koMs + 60 * 60_000)).toBe(true);
  });
  it('stops once a finished match is past the window', () => {
    expect(inGameWindow([{ utcDate: KO, status: 'FINISHED' }], koMs + 300 * 60_000)).toBe(false);
  });
  it('is false for an empty list', () => {
    expect(inGameWindow([], koMs)).toBe(false);
  });
});
