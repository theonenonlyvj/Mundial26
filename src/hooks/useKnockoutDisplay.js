import { useMemo } from 'react';
import { buildKnockout } from '../lib/knockoutDisplay.js';

// matchId -> { home, away } seed displays, so match cards can show "Grp K · 1st",
// "Canada OR South Africa", or "Winner R32" on undecided knockout sides instead of
// a bare TBD. Derived straight from the matches (each knockout fixture is anchored
// to its bracket slot by the fixed schedule — no standings needed).
export function useKnockoutDisplay(matches) {
  return useMemo(() => buildKnockout(matches ?? []).byMatchId, [matches]);
}
