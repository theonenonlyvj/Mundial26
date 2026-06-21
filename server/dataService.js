import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCache, createCachedFetcher } from './cache.js';
import { createFootballDataClient } from './footballDataClient.js';
import { normalizeMatch, normalizeStandings } from './normalize.js';
import { rankGroup, advancementStatus, bestThirds } from './standings.js';
import { HOST_CITIES } from './data/hostCities.js';
import { cityIdForMatch } from './data/matchVenues.js';

const SNAPSHOT = JSON.parse(
  readFileSync(fileURLToPath(new URL('./data/snapshot.json', import.meta.url)), 'utf8'),
);

const cityById = new Map(HOST_CITIES.map((c) => [c.id, c]));

function resolveCity(match) {
  // First try: resolve by stadium name (works when API provides venue)
  if (match.venue) {
    const byVenue = HOST_CITIES.find((c) => c.stadium === match.venue);
    if (byVenue) return byVenue;
  }
  // Fallback: resolve by match id from static bundled schedule map
  const cityId = cityIdForMatch(match.id);
  if (cityId) return cityById.get(cityId) ?? null;
  return null;
}

export function createDataService({ config, fetchImpl = fetch, now = () => Date.now() }) {
  const useApi = Boolean(config.apiKey);
  const cache = createCache({ now });
  const client = createFootballDataClient({ apiKey: config.apiKey, fetchImpl });

  const fetchMatches = createCachedFetcher({
    cache, ttlMs: config.ttls.matches,
    fetcher: () => client.getMatches(),
  });
  const fetchStandings = createCachedFetcher({
    cache, ttlMs: config.ttls.standings,
    fetcher: () => client.getStandings(),
  });
  const fetchScorers = createCachedFetcher({
    cache, ttlMs: config.ttls.scorers,
    fetcher: () => client.getScorers(),
  });

  async function load(key, fetchFn, snapshotValue) {
    if (!useApi) return { value: snapshotValue, stale: true, updatedAt: null };
    try {
      const r = await fetchFn(key);
      return { value: r.value, stale: Boolean(r.stale), updatedAt: now() };
    } catch {
      return { value: snapshotValue, stale: true, updatedAt: null };
    }
  }

  function transformStandings(rawValue) {
    const norm = normalizeStandings(rawValue);
    const ranked = norm.groups.map((g) => ({ group: g.group, table: rankGroup(g.table) }));
    const groups = ranked.map((g) => ({ group: g.group, table: advancementStatus(g.table) }));
    const bestThirdIds = bestThirds(ranked.map((g) => g.table));
    return { groups, bestThirdIds };
  }

  return {
    async getMatches() {
      const { value, stale, updatedAt } = await load('matches', fetchMatches, SNAPSHOT.matches);
      const matches = (value.matches ?? [])
        .map(normalizeMatch)
        .map((m) => ({ ...m, city: resolveCity(m) }));
      return { updatedAt, stale, matches };
    },

    async getStandings() {
      const loaded = await load('standings', fetchStandings, SNAPSHOT.standings);
      try {
        return { ...transformStandings(loaded.value), updatedAt: loaded.updatedAt, stale: loaded.stale };
      } catch {
        return { ...transformStandings(SNAPSHOT.standings), updatedAt: null, stale: true };
      }
    },

    async getScorers() {
      const { value, stale, updatedAt } = await load('scorers', fetchScorers, { scorers: [] });
      return { updatedAt, stale, scorers: value.scorers ?? [] };
    },
  };
}
