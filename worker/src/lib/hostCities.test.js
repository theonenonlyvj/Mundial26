import { describe, it, expect } from 'vitest';
import { HOST_CITIES, getHostCity } from './hostCities.js';

describe('host cities', () => {
  it('has all 16 host cities', () => {
    expect(HOST_CITIES).toHaveLength(16);
  });
  it('each has coordinates and a country', () => {
    for (const c of HOST_CITIES) {
      expect(typeof c.lat).toBe('number');
      expect(typeof c.lng).toBe('number');
      expect(['USA', 'Canada', 'Mexico']).toContain(c.country);
    }
  });
  it('looks up by id', () => {
    expect(getHostCity('mexico-city')?.stadium).toBe('Estadio Azteca');
  });
});
