import { describe, it, expect } from 'vitest';
import { normalizeMatch } from './normalize.js';

describe('normalizeMatch', () => {
  it('flattens a regular finished match (fullTime = final, winner as given)', () => {
    const m = normalizeMatch({
      id: 1, utcDate: 'x', status: 'FINISHED', stage: 'GROUP_STAGE',
      homeTeam: { id: 10, name: 'Mexico', tla: 'MEX' }, awayTeam: { id: 20, name: 'Canada', tla: 'CAN' },
      score: { winner: 'HOME_TEAM', duration: 'REGULAR', fullTime: { home: 2, away: 1 }, halfTime: { home: 1, away: 0 } },
    });
    expect(m.score).toMatchObject({ home: 2, away: 1, winner: 'HOME_TEAM', shootout: false, penalties: null });
    expect(m.score.halfTime).toEqual({ home: 1, away: 0 });
  });

  it('resolves a penalty shootout: shows the score after 120 + derives the real winner', () => {
    // GER-PAR (2026-06-29): 1-1 after ET, Paraguay won the shootout. football-data
    // gives winner:null, an aggregate fullTime 5-6, and a (wrong, tied) penalties.
    const m = normalizeMatch({
      id: 73, utcDate: 'x', status: 'FINISHED', stage: 'LAST_32',
      homeTeam: { id: 1, name: 'Germany', tla: 'GER' }, awayTeam: { id: 2, name: 'Paraguay', tla: 'PAR' },
      score: {
        winner: null, duration: 'PENALTY_SHOOTOUT',
        fullTime: { home: 5, away: 6 }, halfTime: { home: 0, away: 1 },
        regularTime: { home: 1, away: 1 }, extraTime: { home: 0, away: 0 },
        penalties: { home: 5, away: 5 },
      },
    });
    expect(m.score.home).toBe(1);            // score after 120', not the 5-6 aggregate
    expect(m.score.away).toBe(1);
    expect(m.score.winner).toBe('AWAY_TEAM'); // Paraguay advances, NOT Germany
    expect(m.score.shootout).toBe(true);
    expect(m.score.penalties).toEqual({ home: 4, away: 5 }); // derived from the aggregate
  });

  it('keeps football-data\'s explicit winner when it is set on a shootout', () => {
    const m = normalizeMatch({
      id: 2, status: 'FINISHED',
      homeTeam: { name: 'A' }, awayTeam: { name: 'B' },
      score: { winner: 'HOME_TEAM', duration: 'PENALTY_SHOOTOUT', fullTime: { home: 6, away: 5 }, regularTime: { home: 1, away: 1 }, extraTime: { home: 0, away: 0 } },
    });
    expect(m.score.winner).toBe('HOME_TEAM');
    expect(m.score.penalties).toEqual({ home: 5, away: 4 });
  });

  it('canonicalizes the feed\'s "LIVE" status to IN_PLAY', () => {
    const m = normalizeMatch({
      id: 3, status: 'LIVE', homeTeam: { name: 'Mexico' }, awayTeam: { name: 'Ecuador' },
      score: { fullTime: { home: 1, away: 0 }, halfTime: {} },
    });
    expect(m.status).toBe('IN_PLAY');
    expect(m.score).toMatchObject({ home: 1, away: 0 });
  });

  it('drops the feed\'s PROVISIONAL winner on a non-finished match (live leader is not a result)', () => {
    // The feed sets winner=HOME_TEAM on a live 2-0 game (and winner=DRAW at 0-0).
    const live = normalizeMatch({
      id: 9, status: 'LIVE', homeTeam: { id: 1, name: 'Mexico' }, awayTeam: { id: 2, name: 'Ecuador' },
      score: { winner: 'HOME_TEAM', fullTime: { home: 2, away: 0 }, halfTime: {} },
    });
    expect(live.status).toBe('IN_PLAY');
    expect(live.score.winner).toBeNull();               // NOT HOME_TEAM — game isn't over
    expect([live.score.home, live.score.away]).toEqual([2, 0]); // score still shown
    const draw = normalizeMatch({
      id: 9, status: 'IN_PLAY', homeTeam: {}, awayTeam: {},
      score: { winner: 'DRAW', fullTime: { home: 0, away: 0 }, halfTime: {} },
    });
    expect(draw.score.winner).toBeNull();
  });

  it('keeps the winner once the match is FINISHED', () => {
    const done = normalizeMatch({
      id: 9, status: 'FINISHED', homeTeam: { id: 1, name: 'Mexico' }, awayTeam: { id: 2, name: 'Ecuador' },
      score: { winner: 'HOME_TEAM', fullTime: { home: 2, away: 0 }, halfTime: {} },
    });
    expect(done.score.winner).toBe('HOME_TEAM');
  });
});
