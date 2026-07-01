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
const STATUSLOG_KEY = 'statuslog:v1';

// The status strings we know how to handle (football-data's documented set + "LIVE",
// which the WC feed actually emits for in-play games and normalizeMatch aliases to
// IN_PLAY). Anything outside this set is a NOVEL status worth surfacing loudly — it's
// exactly the kind of thing that silently broke live rendering before.
const KNOWN_STATUSES = new Set([
  'SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED', 'LIVE',
  'FINISHED', 'SUSPENDED', 'POSTPONED', 'CANCELLED', 'AWARDED', 'null',
]);

async function readSnapshot(env) {
  const raw = await env.DATA.get(KEY);
  return raw ? JSON.parse(raw) : null;
}

// Append a timestamped entry to the status-vocabulary log — but ONLY when the SET of
// raw statuses the feed emits changes vs the prior snapshot (a score-only change is
// not new vocabulary). That keeps this to a handful of KV writes across the whole
// tournament (KV free tier = 1k writes/day) while still capturing every transition:
// the first "LIVE", the first "PAUSED", any never-seen status. Read via /api/statuslog.
async function logStatusVocab(env, nowMs, prior, counts, unknown) {
  const vocab = Object.keys(counts).sort().join(',');
  const priorVocab = prior?.rawStatusCounts ? Object.keys(prior.rawStatusCounts).sort().join(',') : '';
  if (vocab === priorVocab) return;
  try {
    const raw = await env.DATA.get(STATUSLOG_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push({ at: nowMs, counts, unknown });
    await env.DATA.put(STATUSLOG_KEY, JSON.stringify(arr.slice(-500)));
  } catch (e) {
    console.error('mundial26: statuslog write failed:', e?.message ?? String(e));
  }
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

// A SETTLED result = FINISHED/AWARDED, both scores present, and a winner (incl DRAW).
function isSettledResult(m) {
  const w = m?.score?.winner;
  return (m?.status === 'FINISHED' || m?.status === 'AWARDED')
    && m?.score?.home != null && m?.score?.away != null
    && (w === 'HOME_TEAM' || w === 'AWAY_TEAM' || w === 'DRAW');
}

// Never let a settled result regress to garbage. The free tier flaps a finished
// match back to "TIMED / null-null", or drops the winner flag, for minutes-to-hours
// (observed live: CIV-NOR oscillating FINISHED<->TIMED every tick; NED-MAR going
// FINISHED-decisive -> FINISHED-no-winner). Keep the prior settled result UNLESS the
// new read is itself a clean settled result, OR carries a real, present, DIFFERENT
// score — a legitimate VAR/called-back-goal change, which is always taken.
function preserveDecided(prior, snap) {
  const priorMatches = prior?.matches?.matches;
  if (!priorMatches || !snap?.matches?.matches) return snap;
  const byId = new Map(priorMatches.map((m) => [m.id, m]));
  for (const m of snap.matches.matches) {
    const p = byId.get(m.id);
    if (!isSettledResult(p) || isSettledResult(m)) continue;
    const realChange = m.score?.home != null && m.score?.away != null
      && (m.score.home !== p.score.home || m.score.away !== p.score.away);
    if (!realChange) Object.assign(m, p); // garbage regression -> keep the settled result
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

  // Observability: record the raw status vocabulary every tick (visible in
  // `wrangler tail`), and warn loudly on any status we don't recognize.
  const counts = snap.rawStatusCounts ?? {};
  const unknown = Object.keys(counts).filter((s) => !KNOWN_STATUSES.has(s));
  console.log('mundial26 cron: raw feed statuses', JSON.stringify(counts));
  if (unknown.length) console.warn('mundial26 cron: UNMAPPED feed status(es):', unknown.join(', '));

  if (prior && signature(prior) === signature(snap)) return { unchanged: true };
  await logChanges(env, nowMs, changedMatches(prior, snap));
  await logStatusVocab(env, nowMs, prior, counts, unknown);
  await env.DATA.put(KEY, JSON.stringify({ at: nowMs, ...snap }));
  console.log('mundial26 cron: snapshot updated at', nowMs);
  return { written: true };
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduled({ env, nowMs: Date.now(), fetchImpl: fetch }));
  },
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (pathname === '/api/log') return handleLog(req, env);
    if (pathname === '/api/statuslog') {
      const raw = await env.DATA.get(STATUSLOG_KEY);
      return new Response(raw ?? '[]', {
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS },
      });
    }
    const snap = await readSnapshot(env);
    return handleRequest(req, snap);
  },
};
