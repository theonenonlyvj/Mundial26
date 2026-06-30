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

  it('shows a 2-team pool for a Round-of-16 whose Round-of-32 tie is set', () => {
    // M73 = Los Angeles (Runner-up A vs Runner-up B, ids 2 and 6) — both known.
    const matches = [{ id: 73, stage: 'LAST_32', status: 'SCHEDULED', utcDate: '2026-06-28T19:00:00Z', home: team(2, 'A2'), away: team(6, 'B2'), score: {}, city: { id: 'los-angeles' } }];
    const { nodes } = buildKnockout(matches);
    // M90 feeds from M73 (home side)
    expect(nodes.get(90).homeDisplay.kind).toBe('pool');
    expect(nodes.get(90).homeDisplay.teams.map((t) => t.id).sort()).toEqual([2, 6]);
    expect(nodes.get(90).homeDisplay.label).toBe('A2 or B2');
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
    expect(d.kind).toBe('pool');
    expect(d.teams.map((t) => t.id).sort()).toEqual([1, 4]);
    expect(d.label).toBe('BRA or NOR');
  });

  it('builds a nested "A/B or C/D" 4-way pool for a QF fed by two undecided R16 ties', () => {
    // R16 slot 94 = winner(R32 81) vs winner(R32 82); QF 98 away side feeds from 94.
    // Both R32 are present-but-undecided -> the QF side is "POR/CRO or ESP/AUT".
    const matches = [
      { id: 81, stage: 'LAST_32', status: 'TIMED', utcDate: '2026-07-01T20:00:00Z', home: team(10, 'POR'), away: team(11, 'CRO'), score: {}, city: { id: 'bay-area' } },
      { id: 82, stage: 'LAST_32', status: 'TIMED', utcDate: '2026-07-01T21:00:00Z', home: team(12, 'ESP'), away: team(13, 'AUT'), score: {}, city: { id: 'seattle' } },
    ];
    const d = buildKnockout(matches).nodes.get(98).awayDisplay; // QF 98 away <- R16 94 <- R32 81/82
    expect(d.kind).toBe('pool');
    expect(d.teams.map((t) => t.tla).sort()).toEqual(['AUT', 'CRO', 'ESP', 'POR']);
    expect(d.label).toBe('POR/CRO or ESP/AUT');
  });

  it('builds a WEIGHTED SF pool — closer teams get a bigger slice (the ¼/⅛ example)', () => {
    // SF 101 home <- QF 97 <- R16 89 (PAR vs FRA/SWE) + R16 90 (CAN vs MOR).
    // PAR/CAN/MOR already in R16 → ¼ each; FRA/SWE still owe an R32 → ⅛ each.
    const matches = [
      { id: 73, stage: 'LAST_32', status: 'FINISHED', utcDate: '2026-06-28T19:00:00Z', home: team(20, 'CAN'), away: team(99, 'X'), score: { winner: 'HOME_TEAM' }, city: { id: 'los-angeles' } },
      { id: 74, stage: 'LAST_32', status: 'FINISHED', utcDate: '2026-06-29T20:00:00Z', home: team(21, 'PAR'), away: team(98, 'Y'), score: { winner: 'HOME_TEAM' }, city: { id: 'boston' } },
      { id: 75, stage: 'LAST_32', status: 'FINISHED', utcDate: '2026-06-30T01:00:00Z', home: team(22, 'MOR'), away: team(97, 'Z'), score: { winner: 'HOME_TEAM' }, city: { id: 'monterrey' } },
      { id: 77, stage: 'LAST_32', status: 'TIMED', utcDate: '2026-06-30T21:00:00Z', home: team(23, 'FRA'), away: team(24, 'SWE'), score: {}, city: { id: 'new-york' } },
    ];
    const d = buildKnockout(matches).nodes.get(101).homeDisplay;
    expect(d.kind).toBe('pool');
    const w = Object.fromEntries(d.teams.map((t, i) => [t.tla, d.weights[i]]));
    expect(w.PAR).toBeCloseTo(0.25); expect(w.CAN).toBeCloseTo(0.25); expect(w.MOR).toBeCloseTo(0.25);
    expect(w.FRA).toBeCloseTo(0.125); expect(w.SWE).toBeCloseTo(0.125);
    expect(d.weights.reduce((s, x) => s + x, 0)).toBeCloseTo(1);
    expect(d.label).toBe('PAR/FRA/SWE or CAN/MOR');
  });
});
