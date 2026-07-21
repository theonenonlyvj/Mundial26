import { ARCHIVED_AT } from '../archive.js';
import finalMatches from './final/matches.json';
import finalStandings from './final/standings.json';
import finalScorers from './final/scorers.json';
import finalReference from './final/reference.json';

// Synchronous first-paint data, keyed to match useLiveData keys + each view's
// fetcher shape. Since the 2026-07-19 archive freeze this derives from the
// bundled FINAL snapshot (src/data/final/*) — the same single source client.js
// serves in archive mode — replacing the old fat seed.json (which tripled the
// match list across keys).
const SEED = {
  matches: finalMatches,
  scorers: finalScorers,
  standings: { standings: finalStandings, matches: finalMatches.matches, stale: false },
  cities: { hostCities: finalReference.hostCities, matches: finalMatches.matches, stale: false },
};

const inTest = typeof process !== 'undefined' && process.env
  && (process.env.VITEST || process.env.NODE_ENV === 'test');

export function getSeed(key) {
  if (inTest) return null; // tests assert on stubbed fetch data, not the snapshot
  const data = SEED[key];
  return data !== undefined ? { data, at: ARCHIVED_AT } : null;
}
