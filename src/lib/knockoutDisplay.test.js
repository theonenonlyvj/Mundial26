import { describe, it, expect } from 'vitest';
import { buildKnockout } from './knockoutDisplay.js';

const team = (id, name) => ({ id, name, tla: name, crest: null });

describe('buildKnockout displays', () => {
  it('labels undecided Round-of-32 slots as seeds', () => {
    const { nodes } = buildKnockout([], { groups: [] });
    expect(nodes.get(73).homeDisplay).toEqual({ kind: 'slot', label: 'Grp A · 2nd' }); // Runner-up A
    expect(nodes.get(74).homeDisplay).toEqual({ kind: 'slot', label: 'Grp E · 1st' }); // Winner E
    expect(nodes.get(74).awayDisplay).toEqual({ kind: 'slot', label: '3rd: A/B/C/D/F' });
  });

  it('resolves a team into the card once the fixture carries it', () => {
    // M79 = Mexico City (Winner Group A vs a third-place team).
    const matches = [{ id: 1, stage: 'LAST_32', status: 'SCHEDULED', utcDate: 'x', home: team(1, 'A1'), away: { name: 'TBD' }, score: {}, city: { id: 'mexico-city' } }];
    const { nodes } = buildKnockout(matches);
    expect(nodes.get(79).homeDisplay).toMatchObject({ kind: 'team', team: { id: 1 } });
    expect(nodes.get(79).awayDisplay.kind).toBe('slot');
  });

  it('shows "either" for a Round-of-16 whose Round-of-32 tie is set', () => {
    // M73 = Los Angeles (Runner-up A vs Runner-up B, ids 2 and 6) — both known.
    const matches = [{ id: 73, stage: 'LAST_32', status: 'SCHEDULED', utcDate: '2026-06-28T19:00:00Z', home: team(2, 'A2'), away: team(6, 'B2'), score: {}, city: { id: 'los-angeles' } }];
    const { nodes } = buildKnockout(matches);
    // M90 feeds from M73 (home side)
    expect(nodes.get(90).homeDisplay.kind).toBe('either');
    expect([nodes.get(90).homeDisplay.a.id, nodes.get(90).homeDisplay.b.id].sort()).toEqual([2, 6]);
  });
});
