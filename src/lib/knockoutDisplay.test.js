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

  it('shows the advancing team (not the split) once the feeding match is decided', () => {
    // M73 finished, home (id 2) won — M90 (fed by M73) should show that team.
    const matches = [{ id: 73, stage: 'LAST_32', status: 'FINISHED', utcDate: '2026-06-28T19:00:00Z', home: team(2, 'A2'), away: team(6, 'B2'), score: { winner: 'HOME_TEAM' }, city: { id: 'los-angeles' } }];
    const { nodes } = buildKnockout(matches);
    expect(nodes.get(90).homeDisplay).toMatchObject({ kind: 'team', team: { id: 2 } });
  });

  it("SAFEGUARD: the API's own team wins once the feed fills the slot", () => {
    // M90 itself now carries a real home team — that is authoritative, even over a
    // computed feeder winner. (Here there's no feeder data at all, proving the
    // match's own team is used directly.)
    const matches = [{ id: 90, stage: 'LAST_16', status: 'SCHEDULED', utcDate: '2026-07-04T17:00:00Z', home: team(42, 'WIN'), away: { name: 'TBD' }, score: {}, city: { id: 'houston' } }];
    const { nodes } = buildKnockout(matches);
    expect(nodes.get(90).homeDisplay).toMatchObject({ kind: 'team', team: { id: 42 } });
  });

  it('shows "A or B" in the QF once both R32 feeding an R16 are decided (feed left the R16 TBD)', () => {
    // R32 slot 76 (Houston) won by id 1, slot 78 (Dallas, earlier of dallas pair) by
    // id 4. Their R16 (slot 91) isn't in the feed yet — but QF slot 99 (fed by 91)
    // should still read "1 or 4", not "Winner R16".
    const matches = [
      { id: 76, stage: 'LAST_32', status: 'FINISHED', utcDate: '2026-06-29T17:00:00Z', home: team(1, 'BRA'), away: team(2, 'JPN'), score: { winner: 'HOME_TEAM' }, city: { id: 'houston' } },
      { id: 78, stage: 'LAST_32', status: 'FINISHED', utcDate: '2026-06-30T17:00:00Z', home: team(3, 'CIV'), away: team(4, 'NOR'), score: { winner: 'AWAY_TEAM' }, city: { id: 'dallas' } },
    ];
    const d = buildKnockout(matches).nodes.get(99).homeDisplay; // QF 99 home <- R16 91 <- R32 76/78
    expect(d.kind).toBe('either');
    expect([d.a.id, d.b.id].sort()).toEqual([1, 4]);
  });
});
