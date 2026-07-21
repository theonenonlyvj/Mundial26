import { ARCHIVE_ACTIVE } from '../archive.js';
import finalMatches from '../data/final/matches.json';
import finalStandings from '../data/final/standings.json';
import finalScorers from '../data/final/scorers.json';
import finalReference from '../data/final/reference.json';

// ARCHIVE MODE: the tournament is over and the Worker backend is retired, so
// every "fetch" resolves from the bundled final snapshot — the single chokepoint
// that makes ALL consumers (useLiveData fetchers, useAdvByTeam, MapView's inline
// fetcher) static at once. The network path below is kept only for tests (which
// stub fetch) and for any future un-archiving.
const FINAL = {
  '/api/matches': finalMatches,
  '/api/standings': finalStandings,
  '/api/scorers': finalScorers,
  '/api/reference': finalReference,
};

// In prod the SPA is served from a Render static site, so it must call the API
// service by absolute URL (VITE_API_URL, baked in at build time). In dev/tests
// VITE_API_URL is unset, so we fall back to the same-origin proxy at '/api'.
const BASE = import.meta.env?.VITE_API_URL ?? '';

async function getJson(path) {
  if (ARCHIVE_ACTIVE && FINAL[path]) return FINAL[path];
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

// The upstream feed reports an in-play match with status "LIVE", but the whole
// SPA keys off "IN_PLAY"/"PAUSED" (score-vs-kickoff display, the LIVE badge, the
// "what to watch" hero). Canonicalize on the way in so the app is correct no
// matter what the API — or a stale cached/KV snapshot — emits. This is the
// consumer-side backstop to the worker/server normalizers (defense-in-depth).
const STATUS_ALIASES = { LIVE: 'IN_PLAY' };
function canonicalizeMatches(data) {
  if (!data || !Array.isArray(data.matches)) return data;
  return {
    ...data,
    matches: data.matches.map((m) =>
      (m && STATUS_ALIASES[m.status]) ? { ...m, status: STATUS_ALIASES[m.status] } : m),
  };
}

export const getMatches = () => getJson('/api/matches').then(canonicalizeMatches);
export const getStandings = () => getJson('/api/standings');
export const getScorers = () => getJson('/api/scorers');
export const getReference = () => getJson('/api/reference');
