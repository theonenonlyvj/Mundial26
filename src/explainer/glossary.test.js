import { describe, it, expect } from 'vitest';
import { TERMS, defineTerm } from './glossary.js';

describe('glossary', () => {
  it('defines the core newcomer terms', () => {
    for (const key of ['groupStage', 'goalDifference', 'knockout', 'draw', 'bestThird', 'roundOf32']) {
      expect(TERMS[key]?.define).toBeTruthy();
    }
  });
  it('defineTerm returns the plain-English text', () => {
    expect(defineTerm('draw')).toMatch(/tie/i);
    expect(defineTerm('nope')).toBe('');
  });
});
