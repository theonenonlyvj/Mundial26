import { describe, it, expect } from 'vitest';
import { livePhase } from './livePhase.js';

describe('livePhase', () => {
  it('is null when not live', () => {
    expect(livePhase({ status: 'SCHEDULED' })).toBeNull();
    expect(livePhase({ status: 'FINISHED' })).toBeNull();
  });

  it('reads PAUSED as halftime', () => {
    expect(livePhase({ status: 'PAUSED' })).toBe('Halftime');
  });

  it('is 1st half while in play with no halftime score yet', () => {
    expect(livePhase({ status: 'IN_PLAY', score: { halfTime: { home: null, away: null } } })).toBe('1st half');
    expect(livePhase({ status: 'IN_PLAY' })).toBe('1st half');
  });

  it('is 2nd half while in play once a halftime score is on record', () => {
    expect(livePhase({ status: 'IN_PLAY', score: { halfTime: { home: 0, away: 0 } } })).toBe('2nd half');
    expect(livePhase({ status: 'IN_PLAY', score: { halfTime: { home: 1, away: 0 } } })).toBe('2nd half');
  });
});
