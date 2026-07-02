const LIVE = new Set(['IN_PLAY', 'PAUSED']);
const FINISHED = new Set(['FINISHED', 'AWARDED']);
// A game counts as "on now" for this long after kickoff even if the feed hasn't
// flagged it live — long enough to cover any real match + lag, short enough that a
// glitched never-finished fixture doesn't headline forever. Matches the worker's
// 4h live-refresh window.
const ON_NOW_WINDOW_MS = 4 * 60 * 60 * 1000;

const byKickoff = (a, b) => (a.utcDate < b.utcDate ? -1 : a.utcDate > b.utcDate ? 1 : 0);

// The hero is the CURRENT game, then the NEXT one — never a future fixture while a
// game is on. "On now" = flagged live by the feed, OR kicked off and not yet
// finished: the free tier lags ~1–5 min before marking a just-started match live,
// and in that gap the match is neither "live" nor "upcoming" (its kickoff is
// already in the past) — so without this it vanishes and the hero jumps days ahead.
export function pickMatchToWatch(matches, now = new Date().toISOString()) {
  if (!matches || !matches.length) return null;
  const nowMs = Date.parse(now);

  const onNow = matches.filter((m) => {
    if (FINISHED.has(m.status)) return false;
    if (LIVE.has(m.status)) return true;
    const ko = Date.parse(m.utcDate);
    return Number.isFinite(ko) && ko <= nowMs && nowMs - ko <= ON_NOW_WINDOW_MS;
  });
  if (onNow.length) {
    const live = onNow.filter((m) => LIVE.has(m.status)).sort(byKickoff);
    if (live.length) return { match: live[0], reason: 'Live right now' };
    // Kicked off but the feed hasn't flipped it yet — headline the latest to start.
    const started = [...onNow].sort((a, b) => byKickoff(b, a));
    return { match: started[0], reason: 'Kicking off now' };
  }

  const upcoming = matches
    .filter((m) => !FINISHED.has(m.status) && m.utcDate > now)
    .sort(byKickoff);
  if (upcoming.length) {
    // Prefer the next match with an actual team — never headline a "TBD vs TBD".
    const named = upcoming.filter((m) => m.home?.id || m.away?.id);
    const next = named[0] ?? upcoming[0];
    const knockout = next.stage && next.stage !== 'GROUP_STAGE';
    return { match: next, reason: knockout ? 'Up next — win or go home' : 'Up next' };
  }

  const finished = matches.filter((m) => FINISHED.has(m.status)).sort((a, b) => byKickoff(b, a));
  if (finished.length) return { match: finished[0], reason: 'Latest result' };

  return null;
}
