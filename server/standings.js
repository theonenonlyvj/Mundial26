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

export function advancementStatus(rankedTable) {
  const allComplete = rankedTable.every((r) => r.played >= TOTAL_MATCHDAYS);
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
      const canExceed = others.filter((o) => maxReachable(o) > row.points).length;
      const alreadyAbove = others.filter((o) => o.points > maxReachable(row)).length;
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

export function bestThirds(rankedGroups) {
  const thirds = rankedGroups
    .map((g) => g.find((r) => r.rank === 3))
    .filter(Boolean);
  return thirds
    .sort(compareRows)
    .slice(0, 8)
    .map((r) => String(r.team.id));
}
