import { describe, it, expect } from 'vitest';
import { GROUP_KEYS, groupLabel } from './groups.js';

describe('groups', () => {
  it('has 12 groups A–L', () => {
    expect(GROUP_KEYS).toHaveLength(12);
    expect(GROUP_KEYS[0]).toBe('GROUP_A');
    expect(GROUP_KEYS[11]).toBe('GROUP_L');
  });
  it('labels a group key', () => {
    expect(groupLabel('GROUP_C')).toBe('Group C');
  });
});
