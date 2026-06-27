import { describe, it, expect } from 'vitest';
import { selectComingUp, hasSomethingToShow } from './comingUp.js';

const team = (name) => (name === 'TBD' ? { id: null, name: 'TBD' } : { id: name, name });
// utcDate ascending with id so array order == chronological order
const M = (id, home, away) => ({
  id,
  home: team(home),
  away: team(away),
  utcDate: `2026-06-${String(id).padStart(2, '0')}T18:00:00Z`,
});

describe('hasSomethingToShow', () => {
  it('is true when either side is a decided team', () => {
    expect(hasSomethingToShow(M(1, 'Brazil', 'TBD'), null)).toBe(true);
    expect(hasSomethingToShow(M(1, 'TBD', 'Japan'), null)).toBe(true);
  });
  it('is false for TBD-vs-TBD with no resolvable seed', () => {
    expect(hasSomethingToShow(M(1, 'TBD', 'TBD'), null)).toBe(false);
  });
  it('is true when koDisplay can label an otherwise-TBD side', () => {
    const ko = new Map([[1, { home: { kind: 'slot', label: 'Winner R32' }, away: { kind: 'tbd' } }]]);
    expect(hasSomethingToShow(M(1, 'TBD', 'TBD'), ko)).toBe(true);
  });
});

describe('selectComingUp', () => {
  it('includes a decided match even when many earlier slots are TBD (regression)', () => {
    // Previously bucketMatches sliced upcoming to 6 BEFORE the showable filter,
    // so a decided match sitting at position 7 was dropped entirely.
    const upcoming = [
      M(1, 'TBD', 'TBD'), M(2, 'TBD', 'TBD'), M(3, 'TBD', 'TBD'),
      M(4, 'TBD', 'TBD'), M(5, 'TBD', 'TBD'), M(6, 'TBD', 'TBD'),
      M(7, 'Brazil', 'Japan'),
    ];
    expect(selectComingUp(upcoming, null).map((m) => m.id)).toEqual([7]);
  });

  it('drops contentless TBD-vs-TBD fixtures but keeps decided ones', () => {
    const upcoming = [M(1, 'TBD', 'TBD'), M(2, 'Argentina', 'TBD'), M(3, 'TBD', 'TBD')];
    expect(selectComingUp(upcoming, null).map((m) => m.id)).toEqual([2]);
  });

  it('keeps a TBD side that koDisplay can label as a seed', () => {
    const ko = new Map([[1, { home: { kind: 'slot', label: 'Winner R32' }, away: { kind: 'either', a: {}, b: {} } }]]);
    expect(selectComingUp([M(1, 'TBD', 'TBD')], ko).map((m) => m.id)).toEqual([1]);
  });

  it('caps at the limit', () => {
    const upcoming = Array.from({ length: 12 }, (_, i) => M(i + 1, 'A', 'B'));
    expect(selectComingUp(upcoming, null, 8)).toHaveLength(8);
  });
});
