// In prod the SPA is served from a Render static site, so it must call the API
// service by absolute URL (VITE_API_URL, baked in at build time). In dev/tests
// VITE_API_URL is unset, so we fall back to the same-origin proxy at '/api'.
const BASE = import.meta.env?.VITE_API_URL ?? '';

async function getJson(path) {
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
