import { describe, it, expect } from 'vitest';
import { stageLabel } from './stage.js';

describe('stageLabel', () => {
  it('labels a group match from its group key', () => {
    expect(stageLabel('GROUP_STAGE', 'GROUP_A')).toBe('Group A');
    expect(stageLabel('GROUP_STAGE', 'Group C')).toBe('Group C');
  });

  it('falls back to "Group stage" without a group', () => {
    expect(stageLabel('GROUP_STAGE', null)).toBe('Group stage');
  });

  it('maps knockout stages to readable labels', () => {
    expect(stageLabel('LAST_32')).toBe('Round of 32');
    expect(stageLabel('LAST_16')).toBe('Round of 16');
    expect(stageLabel('QUARTER_FINALS')).toBe('Quarter-final');
    expect(stageLabel('SEMI_FINALS')).toBe('Semi-final');
    expect(stageLabel('FINAL')).toBe('Final');
  });

  it('returns null for an unknown stage', () => {
    expect(stageLabel('SOMETHING_ELSE')).toBeNull();
  });
});
