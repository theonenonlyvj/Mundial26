import { describe, it, expect } from 'vitest';
import { normalizeTeam, normalizeMatch, normalizeStandings, normalizeScorer } from './normalize.js';

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

  it('carries the halftime score through', () => {
    const m = normalizeMatch({
      id: 2, homeTeam: { name: 'A' }, awayTeam: { name: 'B' },
      score: { fullTime: { home: 2, away: 1 }, halfTime: { home: 1, away: 0 } },
    });
    expect(m.score.halfTime).toEqual({ home: 1, away: 0 });
  });
});

describe('normalizeScorer', () => {
  it('flattens a scorer and uses the team crest as the flag', () => {
    const s = normalizeScorer({
      player: { name: 'Lionel Messi', nationality: 'Argentina' },
      team: { id: 1, name: 'Argentina', tla: 'ARG', crest: 'arg.png' },
      goals: 5, assists: null, penalties: null, playedMatches: 2,
    });
    expect(s).toMatchObject({
      name: 'Lionel Messi', nationality: 'Argentina', goals: 5, playedMatches: 2,
      team: { name: 'Argentina', tla: 'ARG', crest: 'arg.png' },
    });
  });

  it('defaults goals to 0 and falls back to the team name for nationality', () => {
    const s = normalizeScorer({ team: { name: 'Brazil' } });
    expect(s).toMatchObject({ name: 'Unknown', nationality: 'Brazil', goals: 0 });
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
