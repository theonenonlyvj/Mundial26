// What phase a live match is in, derived from real fields only (the free tier
// gives no live minute). PAUSED = the halftime break; once the first half ends
// the API records score.halfTime, so an in-play match with a halftime score on
// record is in the second half.
export function livePhase(match) {
  if (!match) return null;
  if (match.status === 'PAUSED') return 'Halftime';
  if (match.status === 'IN_PLAY') {
    const ht = match.score?.halfTime;
    const firstHalfDone = ht && (ht.home != null || ht.away != null);
    return firstHalfDone ? '2nd half' : '1st half';
  }
  return null;
}
