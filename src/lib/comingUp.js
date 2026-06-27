const known = (t) => !!(t && t.name && t.name !== 'TBD');

// A match is worth showing in "Coming Up" if there's anything concrete to say:
// a decided team, or a resolvable knockout seed ("Grp K · 1st", "Winner R32",
// "Canada or South Africa"). We drop ONLY genuinely contentless "TBD vs TBD"
// fixtures (deep bracket slots whose feeders aren't known yet) — those still
// live in Timeline and the bracket.
export function hasSomethingToShow(match, koDisplay) {
  if (known(match.home) || known(match.away)) return true;
  const d = koDisplay?.get(match.id);
  if (!d) return false;
  const labelled = (side) => side && side.kind !== 'tbd';
  return labelled(d.home) || labelled(d.away);
}

// "Coming Up" = the next `limit` upcoming matches that have something to show.
//
// CRITICAL ordering: filter for content FIRST, then take the next N. Never slice
// the raw list before filtering — decided matches sitting behind a wall of TBD
// knockout slots would get dropped before we ever look at them. (`upcoming` is
// expected already sorted ascending by kickoff.)
export function selectComingUp(upcoming, koDisplay, limit = 8) {
  return (upcoming ?? []).filter((m) => hasSomethingToShow(m, koDisplay)).slice(0, limit);
}
