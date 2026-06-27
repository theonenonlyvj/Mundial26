// Status-driven keep-warm + snapshot refresh.
//
// The committed snapshot (src/data/seed.json) is our memory of what's already
// finished. Each run:
//   1. If no match near `now` is still unfinished → games are over → sleep.
//   2. Otherwise fetch live data (this also wakes/keeps the Render API warm so
//      live scores load instantly while people are watching).
//   3. If a game just flipped to FINISHED, rewrite the snapshot (final scores +
//      updated standings/scorers). The workflow commits it → static rebuild.
// So we ping only while a match is genuinely live, refresh exactly at the final
// whistle, then stop — no fixed-minute window guessing.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const API = process.env.API_BASE || 'https://mundial26-y28p.onrender.com';
const LEAD_MIN = 12;   // start waking ~12 min before kickoff (Render cold ~30-50s)
const CAP_MIN = 240;   // outer safety bound, in case a status never flips
const FINISHED = new Set(['FINISHED', 'AWARDED']);
const seedPath = fileURLToPath(new URL('../src/data/seed.json', import.meta.url));

const prior = JSON.parse(readFileSync(seedPath, 'utf8'));
const priorMatches = prior.matches?.matches ?? [];
const priorStatus = new Map(priorMatches.map((m) => [m.id, m.status]));

const now = Date.now();
const nearAndLive = priorMatches.filter((m) => {
  const ko = Date.parse(m.utcDate);
  const near = now >= ko - LEAD_MIN * 60_000 && now <= ko + CAP_MIN * 60_000;
  return near && !FINISHED.has(m.status);
});

if (!nearAndLive.length) {
  console.log('No match live or imminent — letting the server sleep. 😴');
  process.exit(0);
}

async function getJson(path) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`${API}${path}`, { headers: { 'user-agent': 'mundial26-refresh' } });
      if (r.ok) return r.json();
    } catch { /* cold start / transient */ }
    await new Promise((res) => setTimeout(res, 10_000));
  }
  return null;
}

const [matches, standings, scorers, reference] = await Promise.all([
  getJson('/api/matches'), getJson('/api/standings'), getJson('/api/scorers'), getJson('/api/reference'),
]);
if (!matches || !standings || !scorers || !reference) {
  console.log('API not fully reachable yet (woke it; will retry next run).');
  process.exit(0);
}
console.log('Server warm — fetched live data.');

const justEnded = matches.matches.filter(
  (m) => FINISHED.has(m.status) && !FINISHED.has(priorStatus.get(m.id) ?? ''),
);
if (!justEnded.length) {
  console.log('A match is live but none just ended — snapshot left as-is.');
  process.exit(0);
}

const seed = {
  at: now,
  matches,
  scorers,
  standings: { standings, matches: matches.matches },
  cities: { hostCities: reference.hostCities, matches: matches.matches },
};
writeFileSync(seedPath, JSON.stringify(seed));
console.log(`Game(s) ended (ids ${justEnded.map((m) => m.id).join(', ')}) — snapshot refreshed.`);
