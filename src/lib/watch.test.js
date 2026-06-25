import { describe, it, expect } from 'vitest';
import { pickMatchToWatch } from './watch.js';

const NOW = '2026-06-15T12:00:00Z';
const m = (id, over) => ({ id, status: 'SCHEDULED', stage: 'GROUP_STAGE', utcDate: '2026-06-15T18:00:00Z', ...over });

describe('pickMatchToWatch', () => {
  it('returns null for no matches', () => {
    expect(pickMatchToWatch([], NOW)).toBeNull();
  });

  it('headlines a live match above everything else', () => {
    const pick = pickMatchToWatch([m(1), m(2, { status: 'IN_PLAY' })], NOW);
    expect(pick.match.id).toBe(2);
    expect(pick.reason).toMatch(/live/i);
  });

  it('picks a PAUSED match over a scheduled one', () => {
    const pick = pickMatchToWatch([m(1), m(2, { status: 'PAUSED' })], NOW);
    expect(pick.match.id).toBe(2);
    expect(pick.reason).toMatch(/live/i);
  });

  it('picks the NEXT upcoming kickoff when nothing is live (not an earlier one)', () => {
    const pick = pickMatchToWatch([
      m(1, { utcDate: '2026-06-15T20:00:00Z' }),
      m(2, { utcDate: '2026-06-15T14:00:00Z' }),
    ], NOW);
    expect(pick.match.id).toBe(2);
    expect(pick.reason).toMatch(/up next/i);
  });

  it('skips matches that already kicked off / finished when choosing next', () => {
    const pick = pickMatchToWatch([
      m(1, { status: 'FINISHED', utcDate: '2026-06-15T09:00:00Z' }),
      m(2, { utcDate: '2026-06-15T18:00:00Z' }),
    ], NOW);
    expect(pick.match.id).toBe(2);
  });

  it('falls back to the latest result when nothing is live or upcoming', () => {
    const pick = pickMatchToWatch([
      m(1, { status: 'FINISHED', utcDate: '2026-06-14T18:00:00Z' }),
      m(2, { status: 'FINISHED', utcDate: '2026-06-15T09:00:00Z' }),
    ], NOW);
    expect(pick.match.id).toBe(2);
    expect(pick.reason).toMatch(/result/i);
  });

  it('flags a knockout as win-or-go-home in the reason', () => {
    const pick = pickMatchToWatch([m(1, { stage: 'LAST_16', utcDate: '2026-06-15T18:00:00Z' })], NOW);
    expect(pick.reason).toMatch(/win or go home/i);
  });
});
