import { describe, it, expect } from 'vitest';
import { buildKnockout } from './knockoutDisplay.js';

const team = (id, name) => ({ id, name, tla: name, crest: null });
const completeGroup = (key, ids) => ({
  group: `Group ${key}`, table: ids.map((id) => ({ team: team(id, `${key}${id}`), played: 3 })),
});

describe('buildKnockout displays', () => {
  it('labels undecided Round-of-32 slots as seeds', () => {
    const { nodes } = buildKnockout([], { groups: [] });
    expect(nodes.get(73).homeDisplay).toEqual({ kind: 'slot', label: 'Grp A · 2nd' }); // Runner-up A
    expect(nodes.get(74).homeDisplay).toEqual({ kind: 'slot', label: 'Grp E · 1st' }); // Winner E
    expect(nodes.get(74).awayDisplay).toEqual({ kind: 'slot', label: '3rd: A/B/C/D/F' });
  });

  it('resolves a team into the card once its group is complete', () => {
    const standings = { groups: [completeGroup('A', [1, 2, 3, 4])] };
    // M79 = Winner Group A vs a third-place team
    const matches = [{ id: 1, stage: 'LAST_32', status: 'SCHEDULED', utcDate: 'x', home: team(1, 'A1'), away: { name: 'TBD' }, score: {} }];
    const { nodes } = buildKnockout(matches, standings);
    expect(nodes.get(79).homeDisplay).toMatchObject({ kind: 'team', team: { id: 1 } });
    expect(nodes.get(79).awayDisplay.kind).toBe('slot');
  });

  it('shows "either" for a Round-of-16 whose Round-of-32 tie is set', () => {
    const standings = { groups: [completeGroup('A', [1, 2, 3, 4]), completeGroup('B', [5, 6, 7, 8])] };
    // M73 = Runner-up A vs Runner-up B (ids 2 and 6) — both known
    const matches = [{ id: 73, stage: 'LAST_32', status: 'SCHEDULED', utcDate: 'x', home: team(2, 'A2'), away: team(6, 'B2'), score: {} }];
    const { nodes } = buildKnockout(matches, standings);
    // M90 feeds from M73 (home side)
    expect(nodes.get(90).homeDisplay.kind).toBe('either');
    expect([nodes.get(90).homeDisplay.a.id, nodes.get(90).homeDisplay.b.id].sort()).toEqual([2, 6]);
  });
});
