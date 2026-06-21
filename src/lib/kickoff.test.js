import { describe, it, expect } from 'vitest';
import { formatKickoff } from './kickoff.js';

describe('formatKickoff', () => {
  const tz = 'America/Chicago';
  const now = '2026-07-19T18:00:00Z';  // 2026-07-19 in Chicago

  it('shows weekday for a match 2 days away', () => {
    const result = formatKickoff('2026-07-21T20:00:00Z', now, tz);
    expect(result).toMatch(/^[A-Za-z]{3} /);
  });

  it('shows numeric date for a match 7 days away (same weekday)', () => {
    const result = formatKickoff('2026-07-26T20:00:00Z', now, tz);
    expect(result).toMatch(/^\d{1,2}\/\d{1,2},/);
  });

  it('shows weekday for a match exactly 6 days away (boundary)', () => {
    const result = formatKickoff('2026-07-25T20:00:00Z', now, tz);
    expect(result).toMatch(/^[A-Za-z]{3} /);
  });
});
