const LIVE = new Set(['IN_PLAY', 'PAUSED']);

function score(match) {
  if (LIVE.has(match.status)) return 3;
  if (match.stage && match.stage !== 'GROUP_STAGE') return 2;
  return 1;
}

const REASONS = {
  3: 'Live right now',
  2: 'Knockout — win or go home',
  1: 'Group-stage clash',
};

export function pickMatchToWatch(matches) {
  if (!matches.length) return null;
  let best = null;
  let bestScore = -1;
  for (const match of matches) {
    const s = score(match);
    if (s > bestScore || (s === bestScore && match.utcDate < best.utcDate)) {
      best = match;
      bestScore = s;
    }
  }
  return { match: best, reason: REASONS[bestScore] };
}
