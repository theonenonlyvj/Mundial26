// In prod the SPA is served from a Render static site, so it must call the API
// service by absolute URL (VITE_API_URL, baked in at build time). In dev/tests
// VITE_API_URL is unset, so we fall back to the same-origin proxy at '/api'.
const BASE = import.meta.env?.VITE_API_URL ?? '';

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}
export const getMatches = () => getJson('/api/matches');
export const getStandings = () => getJson('/api/standings');
export const getScorers = () => getJson('/api/scorers');
export const getReference = () => getJson('/api/reference');
