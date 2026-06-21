import { describe, it, expect } from 'vitest';
import { pickMatchToWatch } from './watch.js';

const m = (id, over) => ({ id, status: 'SCHEDULED', stage: 'GROUP_STAGE', utcDate: '2026-06-15T18:00:00Z', ...over });

describe('pickMatchToWatch', () => {
  it('returns null for no matches', () => {
    expect(pickMatchToWatch([])).toBeNull();
  });
  it('prefers a live match', () => {
    const pick = pickMatchToWatch([m(1), m(2, { status: 'IN_PLAY' })]);
    expect(pick.match.id).toBe(2);
    expect(pick.reason).toMatch(/live/i);
  });
  it('prefers knockout over group when none live', () => {
    const pick = pickMatchToWatch([m(1), m(2, { stage: 'LAST_16' })]);
    expect(pick.match.id).toBe(2);
    expect(pick.reason).toMatch(/knockout/i);
  });
  it('picks a PAUSED match over a scheduled group match', () => {
    const pick = pickMatchToWatch([m(1), m(2, { status: 'PAUSED' })]);
    expect(pick.match.id).toBe(2);
    expect(pick.reason).toMatch(/live/i);
  });
});
