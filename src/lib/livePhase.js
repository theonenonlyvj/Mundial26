// What phase a live match is in, derived from real fields only (the free tier
// gives no live minute). PAUSED = a break; once the first half ends the API
// records score.halfTime, so an in-play match with a halftime score on record is
// in the second half. score.duration (REGULAR / EXTRA_TIME / PENALTY_SHOOTOUT)
// distinguishes extra time and the shootout — checked FIRST so they aren't
// mislabeled "2nd half" (extra time still has a halftime score on record).
export function livePhase(match) {
  if (!match) return null;
  const duration = match.score?.duration;
  if (match.status === 'IN_PLAY' && duration === 'PENALTY_SHOOTOUT') return 'Penalties';
  if (match.status === 'IN_PLAY' && duration === 'EXTRA_TIME') return 'Extra time';
  if (match.status === 'PAUSED') return duration === 'EXTRA_TIME' ? 'Extra-time break' : 'Halftime';
  if (match.status === 'IN_PLAY') {
    const ht = match.score?.halfTime;
    const firstHalfDone = ht && (ht.home != null || ht.away != null);
    return firstHalfDone ? '2nd half' : '1st half';
  }
  return null;
}
