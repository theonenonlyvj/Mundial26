import { describe, it, expect } from 'vitest';
import { normalizeTeam, normalizeMatch, normalizeStandings } from './normalize.js';

describe('normalizeTeam', () => {
  it('returns a TBD team when null', () => {
    expect(normalizeTeam(null)).toMatchObject({ id: null, name: 'TBD' });
  });
});

describe('normalizeMatch', () => {
  it('flattens the upstream match shape', () => {
    const m = normalizeMatch({
      id: 1, utcDate: '2026-06-11T18:00:00Z', status: 'FINISHED',
      stage: 'GROUP_STAGE', group: 'GROUP_A', matchday: 1, venue: 'Estadio Azteca',
      homeTeam: { id: 10, name: 'Mexico', tla: 'MEX', crest: 'mex.png' },
      awayTeam: { id: 20, name: 'Canada', tla: 'CAN', crest: 'can.png' },
      score: { winner: 'HOME_TEAM', fullTime: { home: 2, away: 1 } },
    });
    expect(m).toMatchObject({
      id: 1, group: 'GROUP_A', venue: 'Estadio Azteca',
      home: { name: 'Mexico' }, away: { name: 'Canada' },
      score: { home: 2, away: 1, winner: 'HOME_TEAM' },
    });
  });
});

describe('normalizeStandings', () => {
  it('keeps only TOTAL tables', () => {
    const out = normalizeStandings({
      standings: [
        { type: 'TOTAL', group: 'GROUP_A', table: [{ position: 1, team: { id: 10, name: 'Mexico' }, playedGames: 1, won: 1, draw: 0, lost: 0, goalsFor: 2, goalsAgainst: 1, goalDifference: 1, points: 3 }] },
        { type: 'HOME', group: 'GROUP_A', table: [] },
      ],
    });
    expect(out.groups).toHaveLength(1);
    expect(out.groups[0].table[0]).toMatchObject({ played: 1, points: 3, goalDifference: 1 });
  });
});
