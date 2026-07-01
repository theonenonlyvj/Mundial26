import { describe, it, expect } from 'vitest';
import { compareRows, rankGroup, advancementStatus, bestThirds, securedGroupStats, groupLetter } from './standings.js';

const row = (over) => ({ team: { id: over.id }, played: 3, won: 0, draw: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, ...over });

describe('compareRows / rankGroup', () => {
  it('orders by points then GD then GF', () => {
    const ranked = rankGroup([
      row({ id: 'a', points: 6, goalDifference: 1, goalsFor: 3 }),
      row({ id: 'b', points: 6, goalDifference: 3, goalsFor: 5 }),
      row({ id: 'c', points: 3, goalDifference: 0, goalsFor: 2 }),
    ]);
    expect(ranked.map((r) => r.team.id)).toEqual(['b', 'a', 'c']);
    expect(ranked[0].rank).toBe(1);
  });
});

describe('advancementStatus (completed group)', () => {
  it('top two are through, bottom two are out', () => {
    const ranked = rankGroup([
      row({ id: 'a', points: 9 }), row({ id: 'b', points: 6 }),
      row({ id: 'c', points: 3 }), row({ id: 'd', points: 0 }),
    ]);
    const out = advancementStatus(ranked);
    expect(out.find((r) => r.team.id === 'a').status).toBe('through');
    expect(out.find((r) => r.team.id === 'b').status).toBe('through');
    expect(out.find((r) => r.team.id === 'd').status).toBe('out');
  });
});

describe('advancementStatus (mid-group)', () => {
  it('marks a team eliminated when two others are already out of reach', () => {
    // played 2 of 3 -> max reachable = points + 3
    const ranked = rankGroup([
      row({ id: 'a', played: 2, points: 6 }),
      row({ id: 'b', played: 2, points: 6 }),
      row({ id: 'c', played: 2, points: 1 }),
      row({ id: 'd', played: 2, points: 1 }),
    ]);
    const out = advancementStatus(ranked);
    // c/d max reachable = 4; a and b already have 6 > 4 -> out
    expect(out.find((r) => r.team.id === 'c').status).toBe('out');
    expect(out.find((r) => r.team.id === 'a').status).toBe('through');
    expect(out.find((r) => r.team.id === 'b').status).toBe('through');
  });

  it('marks a team as alive when outcome is still uncertain', () => {
    // a has 6pts (clinched), b has 3pts, c has 1pt, d has 0pt; all played 2 of 3
    // maxReachable(b) = 3+3=6 -- still matches a; b can finish top-2: alive
    // maxReachable(c) = 1+3=4 -- a already has 6>4: one above; b may match or beat c; c alive
    // d maxReachable=3 -- a(6>3) and b(3 not >3 yet) -- only 1 above d -> alive
    const ranked = rankGroup([
      row({ id: 'a', played: 2, points: 6 }),
      row({ id: 'b', played: 2, points: 3 }),
      row({ id: 'c', played: 2, points: 1 }),
      row({ id: 'd', played: 2, points: 0 }),
    ]);
    const out = advancementStatus(ranked);
    expect(out.find((r) => r.team.id === 'a').status).toBe('through'); // 0 others can finish above
    expect(out.find((r) => r.team.id === 'b').status).toBe('alive');   // a can finish above, not 2 others yet
    expect(out.find((r) => r.team.id === 'c').status).toBe('alive');   // only a exceeds c's max(4)
    expect(out.find((r) => r.team.id === 'd').status).toBe('alive');   // only a exceeds d's max(3)
  });
});

describe('advancementStatus (completed 3-way tie)', () => {
  it('3rd place on GD is alive (not through) even when tied on points', () => {
    // All played 3 — group is complete. a/b/c all 6 pts; ranked by GD: a(5)>b(2)>c(-1)
    const ranked = rankGroup([
      row({ id: 'a', points: 6, goalDifference: 5 }),
      row({ id: 'b', points: 6, goalDifference: 2 }),
      row({ id: 'c', points: 6, goalDifference: -1 }),
      row({ id: 'd', points: 0 }),
    ]);
    const out = advancementStatus(ranked);
    expect(out.find((r) => r.team.id === 'a').status).toBe('through');
    expect(out.find((r) => r.team.id === 'b').status).toBe('through');
    expect(out.find((r) => r.team.id === 'c').status).toBe('alive'); // 3rd on GD — NOT through
    expect(out.find((r) => r.team.id === 'd').status).toBe('out');
  });
});

describe('advancementStatus (incomplete — no false clinch when 2+ others can reach/tie)', () => {
  it('team is alive (not through) when two or more others can still reach or tie its points', () => {
    // a has 4pts, played:2; b and c each have 3pts, played:2 (maxReachable=6>=4); d has 0pts
    // For a: canReachOrTie = [b(maxR=6>=4), c(maxR=6>=4)] → 2 → NOT through
    // The conservative heuristic: if 2+ others can reach/tie you, you are not clinched
    const ranked = rankGroup([
      row({ id: 'a', played: 2, points: 4 }),
      row({ id: 'b', played: 2, points: 3 }),
      row({ id: 'c', played: 2, points: 3 }),
      row({ id: 'd', played: 2, points: 0 }),
    ]);
    const out = advancementStatus(ranked);
    // a: 2 others (b,c) can reach/tie 4pts → canReachOrTie=2 > 1 → not through
    expect(out.find((r) => r.team.id === 'a').status).toBe('alive');
    // b: a(maxR=7>=3), c(maxR=6>=3) can reach/tie → canReachOrTie=3 → not through
    expect(out.find((r) => r.team.id === 'b').status).toBe('alive');
  });
});

describe('advancementStatus (incomplete — a tie is not a threat)', () => {
  it('clinches top two when rivals can only tie, never exceed (the Argentina case)', () => {
    // a: 6pts P2, GD+5. b & c on 3pts can reach 6 (a TIE) but never exceed; d on 0.
    const ranked = rankGroup([
      row({ id: 'a', played: 2, points: 6, goalDifference: 5 }),
      row({ id: 'b', played: 2, points: 3, goalDifference: 0 }),
      row({ id: 'c', played: 2, points: 3, goalDifference: -2 }),
      row({ id: 'd', played: 2, points: 0, goalDifference: -3 }),
    ]);
    const out = advancementStatus(ranked);
    expect(out.find((r) => r.team.id === 'a').status).toBe('through');
    // rivals themselves are still genuinely alive (they can yet exceed each other)
    expect(out.find((r) => r.team.id === 'b').status).toBe('alive');
  });
});

describe('securedGroupStats (finished-only)', () => {
  it('counts only FINISHED group matches and flags a live group as incomplete', () => {
    const matches = [
      { stage: 'GROUP_STAGE', group: 'GROUP_A', status: 'FINISHED', home: { id: 1 }, away: { id: 2 }, score: { home: 2, away: 0 } },
      { stage: 'GROUP_STAGE', group: 'GROUP_A', status: 'IN_PLAY', home: { id: 1 }, away: { id: 3 }, score: { home: 1, away: 0 } }, // live -> ignored
    ];
    const g = securedGroupStats(matches).get('A');
    expect(g.complete).toBe(false);            // a match is still live
    expect(g.points.get(1)).toBe(3);           // only the finished win — NOT the live 1-0
    expect(g.played.get(1)).toBe(1);
    expect(g.points.get(2)).toBe(0);
    expect(g.points.get(3)).toBeUndefined();   // opponent in the live game not counted
  });
  it('normalizes group keys across the feed\'s forms', () => {
    expect(groupLetter('GROUP_A')).toBe('A');
    expect(groupLetter('Group A')).toBe('A');
    expect(groupLetter('A')).toBe('A');
  });
});

describe('advancementStatus (secured gate — no clinch off a live game)', () => {
  it('does NOT mark a team through when its clinch depends on a still-live matchday-3 game', () => {
    // Feed's provisional table counts team a's LIVE matchday-3 win (played 3, 6 pts).
    const ranked = rankGroup([
      row({ id: 'a', played: 3, points: 6 }),
      row({ id: 'b', played: 2, points: 3 }),
      row({ id: 'c', played: 2, points: 3 }),
      row({ id: 'd', played: 3, points: 0 }),
    ]);
    // Trusting the feed clinches team a (the bug).
    expect(advancementStatus(ranked).find((r) => r.team.id === 'a').status).toBe('through');
    // Secured (finished only): a has really played 2 for 3 pts; the group is not complete.
    const secured = {
      complete: false,
      points: new Map([['a', 3], ['b', 3], ['c', 3], ['d', 0]]),
      played: new Map([['a', 2], ['b', 2], ['c', 2], ['d', 3]]),
    };
    expect(advancementStatus(ranked, secured).find((r) => r.team.id === 'a').status).toBe('alive');
  });

  it('still resolves through/out normally once the group is genuinely complete', () => {
    const ranked = rankGroup([
      row({ id: 'a', points: 9 }), row({ id: 'b', points: 6 }),
      row({ id: 'c', points: 3 }), row({ id: 'd', points: 0 }),
    ]);
    const secured = {
      complete: true,
      points: new Map([['a', 9], ['b', 6], ['c', 3], ['d', 0]]),
      played: new Map([['a', 3], ['b', 3], ['c', 3], ['d', 3]]),
    };
    const out = advancementStatus(ranked, secured);
    expect(out.find((r) => r.team.id === 'a').status).toBe('through');
    expect(out.find((r) => r.team.id === 'b').status).toBe('through');
    expect(out.find((r) => r.team.id === 'd').status).toBe('out');
  });
});

describe('bestThirds (small field)', () => {
  it('returns all thirds when fewer than 8 groups exist', () => {
    // Only 3 groups — bestThirds must return all 3 third-place teams, not pad to 8
    const groups = Array.from({ length: 3 }, (_, g) =>
      rankGroup([
        row({ id: `${g}-1`, points: 9 }),
        row({ id: `${g}-2`, points: 6 }),
        row({ id: `${g}-3`, points: 3 }),
        row({ id: `${g}-4`, points: 0 }),
      ]),
    );
    const ids = bestThirds(groups);
    expect(ids).toHaveLength(3);
  });
});

describe('bestThirds', () => {
  it('returns the best 8 third-place team ids', () => {
    const groups = Array.from({ length: 12 }, (_, g) =>
      rankGroup([
        row({ id: `${g}-1`, points: 9 }), row({ id: `${g}-2`, points: 6 }),
        row({ id: `${g}-3`, points: g, goalsFor: g }), row({ id: `${g}-4`, points: 0 }),
      ]),
    );
    const ids = bestThirds(groups);
    expect(ids).toHaveLength(8);
    // For g>=6, ${g}-3 has points>=6 so it ranks above ${g}-2 (pts=6) on goalsFor;
    // the actual rank-3 team in group 11 is '11-2' (pts=6, gf=0), not '11-3' (pts=11,rank-1).
    // Brief had '11-3' which is a test-data bug: corrected to '11-2'.
    expect(ids).toContain('11-2'); // highest-points rank-3 team (pts=6)
    expect(ids).not.toContain('0-3'); // lowest-points third place (pts=0)
  });
});
