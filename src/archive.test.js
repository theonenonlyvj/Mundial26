import { describe, it, expect } from 'vitest';
import { ARCHIVED_AT } from './archive.js';
import finalMatches from './data/final/matches.json';
import finalStandings from './data/final/standings.json';
import finalScorers from './data/final/scorers.json';
import finalReference from './data/final/reference.json';

// The bundled archive IS the site now — if this data is wrong or partial, the
// whole (backend-less) site is wrong. Pin the tournament's ground truth.
describe('final archive snapshot', () => {
  it('contains the complete tournament: 104 matches, all finished', () => {
    expect(finalMatches.matches).toHaveLength(104);
    const unfinished = finalMatches.matches.filter(
      (m) => m.status !== 'FINISHED' && m.status !== 'AWARDED',
    );
    expect(unfinished).toEqual([]);
    expect(finalMatches.stale).toBe(false);
  });

  it('every knockout match has a decisive winner (no or/or can ever render)', () => {
    const ko = finalMatches.matches.filter((m) => m.stage !== 'GROUP_STAGE');
    expect(ko.length).toBeGreaterThanOrEqual(31); // 32-team KO bracket incl. 3rd place
    for (const m of ko) {
      expect(['HOME_TEAM', 'AWAY_TEAM']).toContain(m.score?.winner);
    }
  });

  it('records the real final: Spain 1-0 Argentina', () => {
    const final = finalMatches.matches.find((m) => m.stage === 'FINAL');
    expect(final.home.name).toBe('Spain');
    expect(final.away.name).toBe('Argentina');
    expect(final.score.home).toBe(1);
    expect(final.score.away).toBe(0);
    expect(final.score.winner).toBe('HOME_TEAM');
  });

  it('has full standings, scorers, and host cities', () => {
    expect(finalStandings.groups).toHaveLength(12);
    expect(finalScorers.scorers.length).toBeGreaterThan(0);
    expect(finalScorers.scorers[0].goals).toBeGreaterThanOrEqual(
      finalScorers.scorers[1].goals,
    );
    expect(finalReference.hostCities).toHaveLength(16);
  });

  it('is stamped with the capture time', () => {
    expect(ARCHIVED_AT).toBe(finalMatches.updatedAt);
  });
});
