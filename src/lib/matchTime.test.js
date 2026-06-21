import { describe, it, expect } from 'vitest';
import { dayKey, bucketMatches } from './matchTime.js';

const m = (id, utcDate, status = 'SCHEDULED') => ({ id, utcDate, status, score: {} });

describe('dayKey', () => {
  it('returns local calendar date in the given timezone', () => {
    // 2026-06-15T18:00:00Z is Jun 15 in UTC and Chicago (CDT = UTC-5)
    expect(dayKey('2026-06-15T18:00:00Z', 'America/Chicago')).toBe('2026-06-15');
    // 2026-06-22T01:00:00Z is Jun 21 in Chicago (8 PM CDT), not Jun 22
    expect(dayKey('2026-06-22T01:00:00Z', 'America/Chicago')).toBe('2026-06-21');
    expect(dayKey('', 'America/Chicago')).toBe('');
    expect(dayKey(null, 'America/Chicago')).toBe('');
  });

  it('uses UTC when timeZone is UTC', () => {
    expect(dayKey('2026-06-15T18:00:00Z', 'UTC')).toBe('2026-06-15');
  });
});

describe('bucketMatches', () => {
  const TZ = 'America/Chicago';
  const now = '2026-06-15T12:00:00Z';
  const matches = [
    m(1, '2026-06-14T18:00:00Z', 'FINISHED'),
    m(2, '2026-06-15T18:00:00Z', 'SCHEDULED'),
    m(3, '2026-06-16T18:00:00Z', 'SCHEDULED'),
  ];
  it('splits into today / recent / upcoming', () => {
    const { today, recent, upcoming } = bucketMatches(matches, now, TZ);
    expect(today.map((x) => x.id)).toEqual([2]);
    expect(recent.map((x) => x.id)).toEqual([1]);
    expect(upcoming.map((x) => x.id)).toEqual([3]);
  });

  it('excludes non-FINISHED past matches from recent', () => {
    const input = [
      m(1, '2026-06-14T18:00:00Z', 'FINISHED'),
      m(2, '2026-06-14T20:00:00Z', 'TIMED_OUT'),
    ];
    const { recent } = bucketMatches(input, now, TZ);
    expect(recent.map((x) => x.id)).toEqual([1]);
  });

  it('caps recent at 6 when more than 6 FINISHED past matches exist', () => {
    const input = Array.from({ length: 7 }, (_, i) =>
      m(i + 1, `2026-06-${String(i + 1).padStart(2, '0')}T18:00:00Z`, 'FINISHED')
    );
    const { recent } = bucketMatches(input, now, TZ);
    expect(recent).toHaveLength(6);
  });

  it('regression: 8 PM Chicago (next UTC day) buckets as today not upcoming', () => {
    // now = 2026-06-21T18:00:00Z = Sun 1 PM Chicago
    // match at 2026-06-22T01:00:00Z = Sun 8 PM Chicago (past midnight UTC)
    const nowChicago = '2026-06-21T18:00:00Z';
    const matchSunEvening = m(99, '2026-06-22T01:00:00Z', 'SCHEDULED');
    const { today, upcoming } = bucketMatches([matchSunEvening], nowChicago, 'America/Chicago');
    expect(today.map((x) => x.id)).toEqual([99]);
    expect(upcoming).toHaveLength(0);
  });
});
