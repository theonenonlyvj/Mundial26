async function getJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}
export const getMatches = () => getJson('/api/matches');
export const getStandings = () => getJson('/api/standings');
export const getScorers = () => getJson('/api/scorers');
export const getReference = () => getJson('/api/reference');
