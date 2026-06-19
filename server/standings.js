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
  return rankedTable.map((row) => {
    const others = rankedTable.filter((r) => r !== row);
    const canFinishAbove = others.filter((o) => maxReachable(o) > row.points).length;
    const alreadyAbove = others.filter((o) => o.points > maxReachable(row)).length;

    let status;
    let note;
    if (canFinishAbove <= 1) {
      status = 'through';
      note = row.played >= TOTAL_MATCHDAYS
        ? 'Through to the knockout rounds 🎉'
        : 'Already qualified for the knockouts';
    } else if (alreadyAbove >= 2) {
      status = 'out';
      note = "Eliminated — can't reach the top two";
    } else {
      status = 'alive';
      note = 'Still alive — needs the right results to advance';
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
    .map((r) => r.team.id);
}
