import { describe, it, expect } from 'vitest';
import { knockoutRounds } from './bracket.js';

const m = (id, stage, utcDate) => ({ id, stage, utcDate, status: 'SCHEDULED', score: {} });

describe('knockoutRounds', () => {
  it('groups and orders knockout stages, ignoring group games', () => {
    const rounds = knockoutRounds([
      m(1, 'GROUP_STAGE', '2026-06-12T00:00:00Z'),
      m(2, 'FINAL', '2026-07-19T00:00:00Z'),
      m(3, 'LAST_32', '2026-06-28T00:00:00Z'),
      m(4, 'LAST_32', '2026-06-29T00:00:00Z'),
    ]);
    expect(rounds.map((r) => r.stage)).toEqual(['LAST_32', 'FINAL']);
    expect(rounds[0].matches.map((x) => x.id)).toEqual([3, 4]);
    expect(rounds[0].label).toMatch(/Round of 32/i);
  });
});
