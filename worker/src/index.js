import { buildSnapshot, shouldRefresh, isDecisive } from './snapshot.js';

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
// covers goals, status flips, and qualifications. Excludes updatedAt/stale so
// that a no-change cron tick at a later timestamp doesn't trigger a spurious write.
function signature(snap) {
  return JSON.stringify([
    snap.matches?.matches,
    { groups: snap.standings?.groups, bestThirdIds: snap.standings?.bestThirdIds },
    snap.scorers?.scorers,
  ]);
}

// Which matches changed state vs the prior snapshot (status/score/winner/duration/
// penalties) — one log row gets appended per change.
export function changedMatches(prior, snap) {
  const pById = new Map((prior?.matches?.matches ?? []).map((m) => [m.id, m]));
  const sig = (m) => JSON.stringify([m.status, m.score?.home, m.score?.away, m.score?.winner, m.score?.duration, m.score?.penalties?.home, m.score?.penalties?.away]);
  return (snap?.matches?.matches ?? []).filter((m) => {
    const p = pById.get(m.id);
    return !p || sig(p) !== sig(m);
  });
}

// Append the changed matches to the D1 log. Best-effort: a log failure must NEVER
// break the live snapshot update, so it's wrapped + swallowed (with a console line).
async function logChanges(env, nowMs, changed) {
  if (!env?.LOGDB || !changed.length) return;
  try {
    const stmt = env.LOGDB.prepare(
      'INSERT INTO match_log (ts, match_id, home, away, stage, status, duration, home_score, away_score, winner, pens_home, pens_away) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    );
    await env.LOGDB.batch(changed.map((m) => stmt.bind(
      nowMs, m.id,
      m.home?.tla ?? m.home?.name ?? null, m.away?.tla ?? m.away?.name ?? null,
      m.stage ?? null, m.status ?? null, m.score?.duration ?? null,
      m.score?.home ?? null, m.score?.away ?? null, m.score?.winner ?? null,
      m.score?.penalties?.home ?? null, m.score?.penalties?.away ?? null,
    )));
  } catch (e) {
    console.error('mundial26 cron: D1 log write failed:', e?.message ?? String(e));
  }
}

// Read-only log endpoint: GET /api/log?match=<id>&limit=N -> JSON rows (newest first).
async function handleLog(req, env) {
  if (!env?.LOGDB) return json({ error: 'log db not configured' });
  const url = new URL(req.url);
  const matchId = url.searchParams.get('match');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 2000);
  try {
    const q = matchId
      ? env.LOGDB.prepare('SELECT * FROM match_log WHERE match_id = ? ORDER BY ts DESC, id DESC LIMIT ?').bind(Number(matchId), limit)
      : env.LOGDB.prepare('SELECT * FROM match_log ORDER BY ts DESC, id DESC LIMIT ?').bind(limit);
    const { results } = await q.all();
    return new Response(JSON.stringify({ count: results.length, rows: results }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'content-type': 'application/json', ...CORS } });
  }
}

// Block ONLY the specific free-tier wobble: a FINISHED knockout that HAD a
// decisive winner suddenly reports winner:null while the score is UNCHANGED.
// Anything that represents a real change is taken as-is:
//   - a different score (a disallowed/added goal — e.g. a VAR/offside call-back),
//   - a different decisive winner (a genuine correction),
//   - the match reverting to in-play (status no longer FINISHED).
// So a called-back goal always wins; only the pure "lost the winner flag with the
// same score" garbage is ignored.
function preserveDecided(prior, snap) {
  const priorMatches = prior?.matches?.matches;
  if (!priorMatches || !snap?.matches?.matches) return snap;
  const byId = new Map(priorMatches.map((m) => [m.id, m]));
  for (const m of snap.matches.matches) {
    const p = byId.get(m.id);
    const sameScore = p?.score?.home === m?.score?.home && p?.score?.away === m?.score?.away;
    if (isDecisive(p) && p.status === 'FINISHED' && m.status === 'FINISHED' && !isDecisive(m) && sameScore) {
      m.score = p.score;
    }
  }
  return snap;
}

// Cron body: refresh while a match is live/imminent OR a knockout result is still
// unsettled (or to bootstrap an empty KV). Keeps the prior snapshot on any
// upstream failure, and never downgrades a decided result.
export async function runScheduled({ env, nowMs, fetchImpl = fetch }) {
  const prior = await readSnapshot(env);
  const priorMatches = prior?.matches?.matches ?? [];
  if (priorMatches.length && !shouldRefresh(priorMatches, nowMs)) return { skipped: true };

  let snap;
  try {
    snap = await buildSnapshot({ apiKey: env.FOOTBALL_DATA_API_KEY, fetchImpl, now: () => nowMs });
  } catch (e) {
    // Set-and-forget service: surface upstream failures (e.g. a rotated key 401ing
    // mid-tournament) so `wrangler tail` shows them. We still keep the prior snapshot.
    console.error('mundial26 cron: football-data fetch failed, keeping prior snapshot:', e?.message ?? String(e));
    return { skipped: true, error: true };
  }

  snap = preserveDecided(prior, snap);
  if (prior && signature(prior) === signature(snap)) return { unchanged: true };
  await logChanges(env, nowMs, changedMatches(prior, snap));
  await env.DATA.put(KEY, JSON.stringify({ at: nowMs, ...snap }));
  console.log('mundial26 cron: snapshot updated at', nowMs);
  return { written: true };
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduled({ env, nowMs: Date.now(), fetchImpl: fetch }));
  },
  async fetch(req, env) {
    if (new URL(req.url).pathname === '/api/log') return handleLog(req, env);
    const snap = await readSnapshot(env);
    return handleRequest(req, snap);
  },
};
