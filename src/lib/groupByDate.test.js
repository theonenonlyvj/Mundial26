import { describe, it, expect } from 'vitest';
import { groupMatchesByDay } from './groupByDate.js';

const m = (id, utcDate) => ({ id, utcDate, status: 'SCHEDULED', score: {} });

describe('groupMatchesByDay', () => {
  it('buckets matches by day in ascending order', () => {
    const days = groupMatchesByDay([
      m(1, '2026-06-16T18:00:00Z'),
      m(2, '2026-06-15T18:00:00Z'),
      m(3, '2026-06-15T21:00:00Z'),
    ]);
    expect(days.map((d) => d.dayKey)).toEqual(['2026-06-15', '2026-06-16']);
    expect(days[0].matches.map((x) => x.id)).toEqual([2, 3]);
    expect(days[0].label).toMatch(/Jun 15/);
  });

  it('returns [] for no matches', () => expect(groupMatchesByDay([])).toEqual([]));
});
