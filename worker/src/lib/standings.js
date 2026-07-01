const TOTAL_MATCHDAYS = 3;

export function compareRows(a, b) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return 0; // head-to-head / fair-play not modeled
}

export function rankGroup(table) {
  return [...table]
    .sort(compareRows)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

function maxReachable(row) {
  return row.points + 3 * Math.max(0, TOTAL_MATCHDAYS - row.played);
}

// `secured` (optional) = { complete, points: Map<teamId,pts>, played: Map<teamId,n> }
// derived from FINISHED group matches only — see securedGroupStats. When present,
// clinch/elimination is computed from games actually completed, NOT the feed's
// provisional live standings row (football-data counts an in-progress match as
// played with provisional points, which would flag a team leading a still-LIVE
// matchday-3 game as "Through 🎉"/"Eliminated" before the game is over). Absent,
// it falls back to the feed's row (back-compat).
export function advancementStatus(rankedTable, secured = null) {
  const pointsOf = (row) => (secured ? (secured.points.get(row.team.id) ?? 0) : row.points);
  const playedOf = (row) => (secured ? (secured.played.get(row.team.id) ?? 0) : row.played);
  const maxReach = (row) => pointsOf(row) + 3 * Math.max(0, TOTAL_MATCHDAYS - playedOf(row));
  const allComplete = secured ? secured.complete : rankedTable.every((r) => r.played >= TOTAL_MATCHDAYS);
  return rankedTable.map((row) => {
    let status;
    let note;
    if (allComplete) {
      if (row.rank <= 2) {
        status = 'through';
        note = 'Through to the knockout rounds 🎉';
      } else if (row.rank === 3) {
        status = 'alive';
        note = '3rd place — may still advance as one of the 8 best third-place teams';
      } else {
        status = 'out';
        note = 'Eliminated — finished bottom of the group';
      }
    } else {
      const others = rankedTable.filter((r) => r !== row);
      // A rival only finishes ABOVE you by getting MORE points than you've
      // already secured (you can't lose points). Rivals who can at best TIE you
      // don't knock you out of the top two — your current standing/GD wins the
      // tie. So you've clinched a top-two place once at most one rival can
      // exceed your points. (Counting ties as threats wrongly flagged a clear
      // group leader like a 6-point Argentina as merely "alive".)
      const canExceed = others.filter((o) => maxReach(o) > pointsOf(row)).length;
      const alreadyAbove = others.filter((o) => pointsOf(o) > maxReach(row)).length;
      if (canExceed <= 1) {
        status = 'through';
        note = 'Already guaranteed a top-two place';
      } else if (alreadyAbove >= 2) {
        status = 'out';
        note = "Eliminated — can't reach the top two";
      } else {
        status = 'alive';
        note = 'Still alive — needs the right results to advance';
      }
    }
    return { ...row, status, note };
  });
}

// A group's letter, normalized across the feed's inconsistent forms
// ("GROUP_A" on matches, "Group A" on standings) -> "A".
export function groupLetter(g) {
  return String(g ?? '').replace(/^group[\s_-]*/i, '').trim().toUpperCase();
}

// Points/played SECURED from FINISHED group matches only (never the feed's
// provisional live row), keyed by group letter. `complete` is true only when the
// group has matches and NONE of them is still unfinished — the honest signal for
// "the group is done", replacing the feed's premature played>=3.
export function securedGroupStats(matches) {
  const DONE = new Set(['FINISHED', 'AWARDED']);
  const byGroup = new Map();
  for (const m of matches ?? []) {
    if (m.stage && m.stage !== 'GROUP_STAGE') continue;
    const letter = groupLetter(m.group);
    if (!letter) continue;
    let g = byGroup.get(letter);
    if (!g) { g = { complete: true, points: new Map(), played: new Map() }; byGroup.set(letter, g); }
    if (!DONE.has(m.status)) { g.complete = false; continue; }
    const hid = m.home?.id;
    const aid = m.away?.id;
    const hs = m.score?.home ?? 0;
    const as = m.score?.away ?? 0;
    const award = (id, pts) => {
      if (id == null) return;
      g.points.set(id, (g.points.get(id) ?? 0) + pts);
      g.played.set(id, (g.played.get(id) ?? 0) + 1);
    };
    if (hs > as) { award(hid, 3); award(aid, 0); }
    else if (hs < as) { award(hid, 0); award(aid, 3); }
    else { award(hid, 1); award(aid, 1); }
  }
  return byGroup;
}

export function bestThirds(rankedGroups) {
  const thirds = rankedGroups
    .map((g) => g.find((r) => r.rank === 3))
    .filter(Boolean);
  return thirds
    .sort(compareRows)
    .slice(0, 8)
    .map((r) => String(r.team.id));
}
