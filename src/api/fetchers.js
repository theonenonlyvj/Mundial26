import { getStandings, getMatches } from './client.js';

// Standings + matches together, cached under one key ('standings'), shared by the
// Standings view and the knockout-display hook so they don't double-fetch.
export const fetchStandingsBundle = () =>
  Promise.all([getStandings(), getMatches()])
    .then(([s, m]) => ({ standings: s, matches: m.matches, stale: s.stale ?? m.stale }));
