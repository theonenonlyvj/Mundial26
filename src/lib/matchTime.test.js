import { describe, it, expect } from 'vitest';
import { dayKey, bucketMatches } from './matchTime.js';

const m = (id, utcDate, status = 'SCHEDULED') => ({ id, utcDate, status, score: {} });

describe('dayKey', () => {
  it('takes the UTC date portion', () => {
    expect(dayKey('2026-06-15T18:00:00Z')).toBe('2026-06-15');
    expect(dayKey('')).toBe('');
  });
});

describe('bucketMatches', () => {
  const now = '2026-06-15T12:00:00Z';
  const matches = [
    m(1, '2026-06-14T18:00:00Z', 'FINISHED'),
    m(2, '2026-06-15T18:00:00Z', 'SCHEDULED'),
    m(3, '2026-06-16T18:00:00Z', 'SCHEDULED'),
  ];
  it('splits into today / recent / upcoming', () => {
    const { today, recent, upcoming } = bucketMatches(matches, now);
    expect(today.map((x) => x.id)).toEqual([2]);
    expect(recent.map((x) => x.id)).toEqual([1]);
    expect(upcoming.map((x) => x.id)).toEqual([3]);
  });
});
