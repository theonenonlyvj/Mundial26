import { describe, it, expect } from 'vitest';
import { resolveBracket } from './bracketTree.js';

const team = (id, name) => ({ id, name, tla: name });
const TBD = { id: null, name: 'TBD' };

describe('resolveBracket (schedule-anchored)', () => {
  it('anchors an R32 fixture to its slot by host city, carrying teams + result', () => {
    // Slot 79 = Mexico City / Estadio Azteca (Winner Group A vs a third-place team).
    const matches = [{
      id: 79, stage: 'LAST_32', status: 'FINISHED', utcDate: '2026-06-30T22:00:00Z',
      home: team(1, 'A1'), away: team(9, 'X'),
      score: { home: 2, away: 0, winner: 'HOME_TEAM' }, city: { id: 'mexico-city' },
    }];
    const m79 = resolveBracket(matches).nodes.get(79);
    expect(m79.home.name).toBe('A1');
    expect(m79.winner.name).toBe('A1');
    expect(m79.utcDate).toBe('2026-06-30T22:00:00Z');
  });

  it('attaches a BOTH-TBD fixture to its slot so it keeps its date + venue (the bug)', () => {
    // Slot 77 = New York / MetLife. football-data still shows TBD v TBD, but the
    // fixture carries its date + venue. It MUST anchor anyway — no bare placeholder.
    const matches = [{
      id: 537416, stage: 'LAST_32', status: 'TIMED', utcDate: '2026-06-30T21:00:00Z',
      home: TBD, away: TBD, score: {}, city: { id: 'new-york', stadium: 'MetLife Stadium' },
    }];
    const m77 = resolveBracket(matches).nodes.get(77);
    expect(m77.match?.id).toBe(537416);
    expect(m77.utcDate).toBe('2026-06-30T21:00:00Z');
    expect(m77.home).toBeNull();
    expect(m77.homeLabel).toMatch(/Winner Group I/);
  });

  it('disambiguates the two slots a city hosts in one round by date order', () => {
    // Los Angeles / SoFi hosts R32 slots 73 (Jun 28) and 84 (Jul 2).
    const matches = [
      { id: 84, stage: 'LAST_32', status: 'TIMED', utcDate: '2026-07-02T19:00:00Z', home: TBD, away: TBD, score: {}, city: { id: 'los-angeles' } },
      { id: 73, stage: 'LAST_32', status: 'TIMED', utcDate: '2026-06-28T19:00:00Z', home: TBD, away: TBD, score: {}, city: { id: 'los-angeles' } },
    ];
    const { nodes } = resolveBracket(matches);
    expect(nodes.get(73).match.id).toBe(73); // earlier date -> earlier slot
    expect(nodes.get(84).match.id).toBe(84);
  });

  it('shows the slot label (not a guessed team) when no fixture is available', () => {
    const m83 = resolveBracket([]).nodes.get(83); // Runner-up K vs Runner-up L
    expect(m83.match).toBeNull();
    expect(m83.homeLabel).toMatch(/Runner-up Group K/);
    expect(m83.awayLabel).toMatch(/Runner-up Group L/);
  });

  it('attaches an R16 fixture (with its teams) to the right slot by city', () => {
    // Slot 92 = Mexico City in the Round of 16; feeders are R32 slots 79 + 80.
    const matches = [{
      id: 92, stage: 'LAST_16', status: 'SCHEDULED', utcDate: '2026-07-05T20:00:00Z',
      home: team(1, 'A1'), away: team(5, 'L1'), score: {}, city: { id: 'mexico-city' },
    }];
    const m92 = resolveBracket(matches).nodes.get(92);
    expect(m92.feeders).toEqual([79, 80]);
    expect([m92.home?.id, m92.away?.id].sort()).toEqual([1, 5]);
  });
});
