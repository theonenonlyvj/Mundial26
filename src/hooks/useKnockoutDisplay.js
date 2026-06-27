import { useMemo } from 'react';
import { useLiveData } from './useLiveData.js';
import { fetchStandingsBundle } from '../api/fetchers.js';
import { buildKnockout } from '../lib/knockoutDisplay.js';

// matchId -> { home, away } seed displays, so match cards can show "Grp K · 1st"
// or "Canada OR South Africa" on undecided knockout sides instead of bare TBD.
export function useKnockoutDisplay(matches) {
  const { data } = useLiveData('standings', fetchStandingsBundle);
  const standings = data?.standings ?? null;
  return useMemo(() => buildKnockout(matches ?? [], standings).byMatchId, [matches, standings]);
}
