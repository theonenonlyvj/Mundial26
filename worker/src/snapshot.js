import { createFootballDataClient } from './lib/footballDataClient.js';
import { normalizeMatch, normalizeStandings, normalizeScorer } from './lib/normalize.js';
import { rankGroup, advancementStatus, bestThirds } from './lib/standings.js';
import { HOST_CITIES } from './lib/hostCities.js';
import { cityIdForMatch } from './lib/matchVenues.js';
import { channelsForMatch } from './lib/matchChannels.js';

const LEAD_MIN = 12;
const CAP_MIN = 240;

// A match keeps the cron refreshing from 12 min before kickoff to 240 min after.
// Purely TIME-based (no status check): we deliberately keep fetching even after a
// match shows FINISHED, because the free tier serves transient/wrong results
// around full time — especially penalty shootouts — and corrects them minutes
// later. Stopping at the first FINISHED reading froze a wrong result on the live
// site (GER-PAR, 2026-06-29). 240 min covers 90'+ET+penalties plus a late
// correction; outside any window the cron still no-ops.
export function inGameWindow(matches, nowMs) {
  return (matches ?? []).some((m) => {
    const ko = Date.parse(m.utcDate);
    return nowMs >= ko - LEAD_MIN * 60_000 && nowMs <= ko + CAP_MIN * 60_000;
  });
}

const cityById = new Map(HOST_CITIES.map((c) => [c.id, c]));

// Resolve a match's host city: by stadium name if the API gave one, else by the
// static match-id → city map (the free tier returns venue:null).
function resolveCity(match) {
  if (match.venue) {
    const byVenue = HOST_CITIES.find((c) => c.stadium === match.venue);
    if (byVenue) return byVenue;
  }
  const cityId = cityIdForMatch(match.id);
  if (cityId) return cityById.get(cityId) ?? null;
  return null;
}

function transformStandings(raw) {
  const norm = normalizeStandings(raw);
  const ranked = norm.groups.map((g) => ({ group: g.group, table: rankGroup(g.table) }));
  const groups = ranked.map((g) => ({ group: g.group, table: advancementStatus(g.table) }));
  const bestThirdIds = bestThirds(ranked.map((g) => g.table));
  return { groups, bestThirdIds };
}

// Fetch everything from football-data and shape it EXACTLY like the current API's
// /api/* responses, so the SPA needs no reshaping. Rejects if any call fails.
export async function buildSnapshot({ apiKey, fetchImpl = fetch, now = () => Date.now() }) {
  const client = createFootballDataClient({ apiKey, fetchImpl });
  const [rawMatches, rawStandings, rawScorers] = await Promise.all([
    client.getMatches(), client.getStandings(), client.getScorers(),
  ]);
  const at = now();
  const matches = (rawMatches.matches ?? [])
    .map(normalizeMatch)
    .map((m) => ({ ...m, city: resolveCity(m), channels: channelsForMatch(m.id) }));
  return {
    matches: { updatedAt: at, stale: false, matches },
    standings: { ...transformStandings(rawStandings), updatedAt: at, stale: false },
    scorers: { updatedAt: at, stale: false, scorers: (rawScorers.scorers ?? []).map(normalizeScorer) },
    reference: { hostCities: HOST_CITIES },
  };
}
