import { buildSnapshot, inGameWindow } from './snapshot.js';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
};

function json(body) {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=20, stale-while-revalidate=40',
      ...CORS,
    },
  });
}

// Read-only. Given the latest snapshot (or null), return the requested slice in
// the exact shape the SPA consumes. Never calls football-data.
export function handleRequest(req, snap) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const { pathname } = new URL(req.url);
  switch (pathname) {
    case '/api/matches':   return json(snap?.matches   ?? { updatedAt: null, stale: true, matches: [] });
    case '/api/standings': return json(snap?.standings ?? { updatedAt: null, stale: true, groups: [], bestThirdIds: [] });
    case '/api/scorers':   return json(snap?.scorers   ?? { updatedAt: null, stale: true, scorers: [] });
    case '/api/reference': return json(snap?.reference ?? { hostCities: [] });
    case '/api/health':    return json({ ok: true, at: snap?.at ?? null });
    default:               return new Response('Not found', { status: 404, headers: CORS });
  }
}

const KEY = 'snapshot:v1';

async function readSnapshot(env) {
  const raw = await env.DATA.get(KEY);
  return raw ? JSON.parse(raw) : null;
}

// What we treat as a meaningful change (skip KV writes otherwise — KV free tier
// is 1k writes/day). standings + scorers derive from match results, so this
// covers goals, status flips, and qualifications.
function signature(snap) {
  return JSON.stringify([snap.matches.matches, snap.standings, snap.scorers]);
}

// Cron body: refresh ONLY while a match is live/imminent (or to bootstrap an
// empty KV). Keeps the prior snapshot on any upstream failure.
export async function runScheduled({ env, nowMs, fetchImpl = fetch }) {
  const prior = await readSnapshot(env);
  const priorMatches = prior?.matches?.matches ?? [];
  if (priorMatches.length && !inGameWindow(priorMatches, nowMs)) return { skipped: true };

  let snap;
  try {
    snap = await buildSnapshot({ apiKey: env.FOOTBALL_DATA_API_KEY, fetchImpl, now: () => nowMs });
  } catch {
    return { skipped: true, error: true }; // keep the prior snapshot
  }

  if (prior && signature(prior) === signature(snap)) return { unchanged: true };
  await env.DATA.put(KEY, JSON.stringify({ at: nowMs, ...snap }));
  return { written: true };
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduled({ env, nowMs: Date.now(), fetchImpl: fetch }));
  },
  async fetch(req, env) {
    const snap = await readSnapshot(env);
    return handleRequest(req, snap);
  },
};
