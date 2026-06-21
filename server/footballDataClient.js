const DEFAULT_BASE = 'https://api.football-data.org/v4';

export function createFootballDataClient({ apiKey = '', fetchImpl = fetch, baseUrl = DEFAULT_BASE } = {}) {
  async function request(path) {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      headers: apiKey ? { 'X-Auth-Token': apiKey } : {},
    });
    if (!res.ok) {
      throw new Error(`football-data.org ${res.status} for ${path}`);
    }
    return res.json();
  }
  return {
    getMatches: () => request('/competitions/WC/matches'),
    getStandings: () => request('/competitions/WC/standings'),
    getScorers: () => request('/competitions/WC/scorers'),
  };
}
