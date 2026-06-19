import { describe, it, expect } from 'vitest';
import { createDataService } from './dataService.js';

describe('dataService (snapshot mode, no api key)', () => {
  const svc = createDataService({ config: { apiKey: '', ttls: { matches: 1, standings: 1, scorers: 1 } } });

  it('serves normalized matches with city resolved from venue', async () => {
    const { matches, stale } = await svc.getMatches();
    expect(stale).toBe(true);
    const m1 = matches.find((m) => m.id === 1);
    expect(m1.home.name).toBe('Mexico');
    expect(m1.city?.id).toBe('mexico-city'); // venue "Estadio Azteca" -> city
  });

  it('serves standings with advancement status + bestThirdIds', async () => {
    const { groups, bestThirdIds } = await svc.getStandings();
    const groupA = groups.find((g) => g.group === 'GROUP_A');
    expect(groupA.table[0]).toHaveProperty('status');
    expect(Array.isArray(bestThirdIds)).toBe(true);
  });
});
