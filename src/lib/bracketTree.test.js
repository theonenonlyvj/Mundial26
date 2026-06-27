import { describe, it, expect } from 'vitest';
import { resolveBracket } from './bracketTree.js';

const team = (id, name) => ({ id, name, tla: name });
const completeGroup = (key, ids) => ({
  group: `Group ${key}`,
  table: ids.map((id) => ({ team: team(id, `${key}${id}`), played: 3 })),
});

describe('resolveBracket', () => {
  it('anchors an R32 node to the live match holding its group winner', () => {
    const standings = { groups: [completeGroup('A', [1, 2, 3, 4])] };
    // M79 = Winner Group A vs a third-place team
    const matches = [{
      stage: 'LAST_32', status: 'FINISHED', utcDate: 'x',
      home: team(1, 'A1'), away: team(9, 'X'),
      score: { home: 2, away: 0, winner: 'HOME_TEAM' },
    }];
    const { nodes } = resolveBracket(matches, standings);
    const m79 = nodes.get(79);
    expect(m79.home.name).toBe('A1');
    expect(m79.winner.name).toBe('A1');
  });

  it('shows the slot label (not a guessed team) when a group is unresolved', () => {
    const { nodes } = resolveBracket([], { groups: [] });
    const m83 = nodes.get(83); // Runner-up K vs Runner-up L
    expect(m83.home).toBeNull();
    expect(m83.homeLabel).toMatch(/Runner-up Group K/);
    expect(m83.awayLabel).toMatch(/Runner-up Group L/);
  });

  it('propagates winners up the tree to resolve a later round', () => {
    const standings = { groups: [completeGroup('A', [1, 2, 3, 4]), completeGroup('L', [5, 6, 7, 8])] };
    const matches = [
      // M79 (Winner A) and M80 (Winner L) — both feeders of M92
      { stage: 'LAST_32', status: 'FINISHED', utcDate: 'x', home: team(1, 'A1'), away: team(9, 'X'), score: { winner: 'HOME_TEAM' } },
      { stage: 'LAST_32', status: 'FINISHED', utcDate: 'x', home: team(5, 'L1'), away: team(10, 'Y'), score: { winner: 'HOME_TEAM' } },
      // the R16 match those two winners meet in (M92)
      { stage: 'LAST_16', status: 'SCHEDULED', utcDate: 'x', home: team(1, 'A1'), away: team(5, 'L1'), score: {} },
    ];
    const { nodes } = resolveBracket(matches, standings);
    const m92 = nodes.get(92);
    expect(m92.feeders).toEqual([79, 80]);
    expect([m92.home?.id, m92.away?.id].sort()).toEqual([1, 5]);
  });
});
