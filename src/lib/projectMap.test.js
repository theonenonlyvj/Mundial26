import { describe, it, expect } from 'vitest';
import { project } from './projectMap.js';

describe('project', () => {
  const size = { width: 1000, height: 1000 };
  it('maps the SW corner to bottom-left and NE corner to top-right', () => {
    expect(project(14, -130, size)).toEqual({ x: 0, y: 1000 });
    expect(project(60, -66, size)).toEqual({ x: 1000, y: 0 });
  });
  it('keeps north above south', () => {
    expect(project(50, -100, size).y).toBeLessThan(project(20, -100, size).y);
  });
});
