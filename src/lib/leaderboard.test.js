import { describe, it, expect } from 'vitest';
import { rankScorers } from './leaderboard.js';

describe('rankScorers', () => {
  it('returns [] for no scorers', () => {
    expect(rankScorers([])).toEqual([]);
  });

  it('ranks by goals descending', () => {
    const out = rankScorers([{ name: 'A', goals: 2 }, { name: 'B', goals: 5 }]);
    expect(out.map((s) => s.name)).toEqual(['B', 'A']);
    expect(out.map((s) => s.rank)).toEqual([1, 2]);
  });

  it('gives tied players the same rank, then skips (1,2,2,4)', () => {
    const out = rankScorers([
      { name: 'A', goals: 5 }, { name: 'B', goals: 3 },
      { name: 'C', goals: 3 }, { name: 'D', goals: 1 },
    ]);
    expect(out.map((s) => s.rank)).toEqual([1, 2, 2, 4]);
  });
});
