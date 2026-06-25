const LIVE = new Set(['IN_PLAY', 'PAUSED']);
const FINISHED = new Set(['FINISHED', 'AWARDED']);

const byKickoff = (a, b) => (a.utcDate < b.utcDate ? -1 : a.utcDate > b.utcDate ? 1 : 0);

// The hero should always be what's LIVE or NEXT — never a random earlier game.
// Priority: a live match → else the next upcoming kickoff → else the latest result.
export function pickMatchToWatch(matches, now = new Date().toISOString()) {
  if (!matches || !matches.length) return null;

  const live = matches.filter((m) => LIVE.has(m.status)).sort(byKickoff);
  if (live.length) return { match: live[0], reason: 'Live right now' };

  const upcoming = matches
    .filter((m) => !LIVE.has(m.status) && !FINISHED.has(m.status) && m.utcDate >= now)
    .sort(byKickoff);
  if (upcoming.length) {
    const next = upcoming[0];
    const knockout = next.stage && next.stage !== 'GROUP_STAGE';
    return { match: next, reason: knockout ? 'Up next — win or go home' : 'Up next' };
  }

  const finished = matches.filter((m) => FINISHED.has(m.status)).sort((a, b) => byKickoff(b, a));
  if (finished.length) return { match: finished[0], reason: 'Latest result' };

  return null;
}
