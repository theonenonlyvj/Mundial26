import { describe, it, expect } from 'vitest';
import { compareRows, rankGroup, advancementStatus, bestThirds } from './standings.js';

const row = (over) => ({ team: { id: over.id }, played: 3, won: 0, draw: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, ...over });

describe('compareRows / rankGroup', () => {
  it('orders by points then GD then GF', () => {
    const ranked = rankGroup([
      row({ id: 'a', points: 6, goalDifference: 1, goalsFor: 3 }),
      row({ id: 'b', points: 6, goalDifference: 3, goalsFor: 5 }),
      row({ id: 'c', points: 3, goalDifference: 0, goalsFor: 2 }),
    ]);
    expect(ranked.map((r) => r.team.id)).toEqual(['b', 'a', 'c']);
    expect(ranked[0].rank).toBe(1);
  });
});

describe('advancementStatus (completed group)', () => {
  it('top two are through, bottom two are out', () => {
    const ranked = rankGroup([
      row({ id: 'a', points: 9 }), row({ id: 'b', points: 6 }),
      row({ id: 'c', points: 3 }), row({ id: 'd', points: 0 }),
    ]);
    const out = advancementStatus(ranked);
    expect(out.find((r) => r.team.id === 'a').status).toBe('through');
    expect(out.find((r) => r.team.id === 'b').status).toBe('through');
    expect(out.find((r) => r.team.id === 'd').status).toBe('out');
  });
});

describe('advancementStatus (mid-group)', () => {
  it('marks a team eliminated when two others are already out of reach', () => {
    // played 2 of 3 -> max reachable = points + 3
    const ranked = rankGroup([
      row({ id: 'a', played: 2, points: 6 }),
      row({ id: 'b', played: 2, points: 6 }),
      row({ id: 'c', played: 2, points: 1 }),
      row({ id: 'd', played: 2, points: 1 }),
    ]);
    const out = advancementStatus(ranked);
    // c/d max reachable = 4; a and b already have 6 > 4 -> out
    expect(out.find((r) => r.team.id === 'c').status).toBe('out');
  });
});

describe('bestThirds', () => {
  it('returns the best 8 third-place team ids', () => {
    const groups = Array.from({ length: 12 }, (_, g) =>
      rankGroup([
        row({ id: `${g}-1`, points: 9 }), row({ id: `${g}-2`, points: 6 }),
        row({ id: `${g}-3`, points: g, goalsFor: g }), row({ id: `${g}-4`, points: 0 }),
      ]),
    );
    const ids = bestThirds(groups);
    expect(ids).toHaveLength(8);
    // For g>=6, ${g}-3 has points>=6 so it ranks above ${g}-2 (pts=6) on goalsFor;
    // the actual rank-3 team in group 11 is '11-2' (pts=6, gf=0), not '11-3' (pts=11,rank-1).
    // Brief had '11-3' which is a test-data bug: corrected to '11-2'.
    expect(ids).toContain('11-2'); // highest-points rank-3 team (pts=6)
    expect(ids).not.toContain('0-3'); // lowest-points third place (pts=0)
  });
});
