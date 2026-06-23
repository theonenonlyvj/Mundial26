// Ranks scorers by goals (desc), giving tied players the same rank
// (standard competition ranking: 1, 2, 2, 4).
export function rankScorers(scorers = []) {
  const sorted = [...scorers].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0));
  let lastGoals = null;
  let lastRank = 0;
  return sorted.map((s, i) => {
    const goals = s.goals ?? 0;
    const rank = goals === lastGoals ? lastRank : i + 1;
    lastGoals = goals;
    lastRank = rank;
    return { ...s, rank };
  });
}
