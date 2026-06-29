# Static Edge-Data Architecture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Mundial26's live data off the sleeping Render Express API and onto a free Cloudflare Worker (1-min game-gated cron writes a snapshot to KV; per-request reads serve it from the edge), so the page at the existing Render URL never cold-starts and never shows a stale fallback.

**Architecture:** A Cloudflare Worker has two independent handlers — `scheduled` (cron, every minute) only *writes* (gate → fetch football-data → normalize → KV), and `fetch` (per request) only *reads* (return the KV snapshot slice with CORS + cache headers). The Worker mirrors the current API's `/api/*` paths and JSON shapes, so the React SPA's only change is pointing `VITE_API_URL` at the Worker. The Render static site (and its URL) is unchanged; the Express service is retired last.

**Tech Stack:** Cloudflare Workers + Workers KV (wrangler), vitest, existing React/Vite SPA on Render static.

## Global Constraints

- The public page URL stays **`https://mundial26-app.onrender.com`** (SPA stays on Render static).
- The Worker MUST return the **same paths and JSON shapes** as today's API: `/api/matches` → `{updatedAt, stale, matches:[…]}`, `/api/standings` → `{groups, bestThirdIds, updatedAt, stale}`, `/api/scorers` → `{updatedAt, stale, scorers:[…]}`, `/api/reference` → `{hostCities:[…]}`.
- football-data free tier limit is **10 requests/minute** (counter resets every 60s). The cron makes ≤4 calls/min and only inside game windows; **0** calls otherwise.
- Workers KV free tier allows **1,000 writes/day** — the cron writes **only when the snapshot changed**.
- Cron schedule is **`* * * * *`** (every minute); the handler no-ops in milliseconds outside game windows.
- The football-data API key lives **only** as a Worker secret (`FOOTBALL_DATA_API_KEY`); it is never shipped to the browser.
- All code is **ESM**. The Worker runtime has no Node `fs` — never `readFileSync` in Worker code.
- Game-window gate constants (from the existing `scripts/refresh.mjs`): `LEAD_MIN = 12`, `CAP_MIN = 240`, finished statuses `FINISHED`/`AWARDED`.

---

## Task 1: Scaffold the Worker + port libs + the game-window gate

**Files:**
- Create: `worker/package.json`, `worker/wrangler.toml`, `worker/.gitignore`
- Create (copied verbatim from server): `worker/src/lib/normalize.js`, `worker/src/lib/standings.js`, `worker/src/lib/footballDataClient.js`, `worker/src/lib/hostCities.js`, `worker/src/lib/matchVenues.js`, `worker/src/lib/matchChannels.js`
- Create: `worker/src/snapshot.js`
- Test: `worker/src/snapshot.test.js`

**Interfaces:**
- Produces: `inGameWindow(matches: Array<{utcDate, status}>, nowMs: number): boolean` from `worker/src/snapshot.js`.

- [ ] **Step 1: Scaffold the project files**

Create `worker/package.json`:
```json
{
  "name": "mundial26-data",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^2.1.9",
    "wrangler": "^3.90.0"
  }
}
```

Create `worker/wrangler.toml` (the KV `id` is filled in Task 5):
```toml
name = "mundial26-data"
main = "src/index.js"
compatibility_date = "2026-06-29"

kv_namespaces = [
  { binding = "DATA", id = "PLACEHOLDER_SET_IN_TASK_5" }
]

[triggers]
crons = ["* * * * *"]
```

Create `worker/.gitignore`:
```
node_modules
.wrangler
.dev.vars
```

- [ ] **Step 2: Install deps and copy the six self-contained server modules verbatim**

Run (from repo root):
```bash
cd worker && npm install && cd ..
cp server/normalize.js          worker/src/lib/normalize.js
cp server/standings.js          worker/src/lib/standings.js
cp server/footballDataClient.js worker/src/lib/footballDataClient.js
cp server/data/hostCities.js    worker/src/lib/hostCities.js
cp server/data/matchVenues.js   worker/src/lib/matchVenues.js
cp server/data/matchChannels.js worker/src/lib/matchChannels.js
```
These modules have **no imports** (verified) and use only `fetch` (a Worker global), so they run unchanged.

- [ ] **Step 3: Write the failing test for `inGameWindow`**

Create `worker/src/snapshot.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { inGameWindow } from './snapshot.js';

const KO = '2026-06-29T18:00:00Z';
const koMs = Date.parse(KO);

describe('inGameWindow', () => {
  it('is true within [kickoff-12min, kickoff+240min] for an unfinished match', () => {
    expect(inGameWindow([{ utcDate: KO, status: 'TIMED' }], koMs - 10 * 60_000)).toBe(true); // imminent
    expect(inGameWindow([{ utcDate: KO, status: 'IN_PLAY' }], koMs + 60 * 60_000)).toBe(true); // live
  });
  it('is false before the lead window and long after kickoff', () => {
    expect(inGameWindow([{ utcDate: KO, status: 'TIMED' }], koMs - 30 * 60_000)).toBe(false);
    expect(inGameWindow([{ utcDate: KO, status: 'TIMED' }], koMs + 300 * 60_000)).toBe(false);
  });
  it('is false for a finished match even inside the window', () => {
    expect(inGameWindow([{ utcDate: KO, status: 'FINISHED' }], koMs + 60 * 60_000)).toBe(false);
  });
  it('is false for an empty list', () => {
    expect(inGameWindow([], koMs)).toBe(false);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd worker && npx vitest run src/snapshot.test.js`
Expected: FAIL — `Failed to resolve import "./snapshot.js"` / `inGameWindow is not a function`.

- [ ] **Step 5: Implement `inGameWindow` in `worker/src/snapshot.js`**

Create `worker/src/snapshot.js`:
```js
const LEAD_MIN = 12;
const CAP_MIN = 240;
const FINISHED = new Set(['FINISHED', 'AWARDED']);

// A match window is open from 12 min before kickoff to 240 min after, while the
// match is not yet finished. Purely time-based on the stored schedule — no
// football-data call needed to decide whether to refresh.
export function inGameWindow(matches, nowMs) {
  return (matches ?? []).some((m) => {
    const ko = Date.parse(m.utcDate);
    return nowMs >= ko - LEAD_MIN * 60_000 && nowMs <= ko + CAP_MIN * 60_000 && !FINISHED.has(m.status);
  });
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd worker && npx vitest run src/snapshot.test.js`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add worker/
git commit -m "feat(worker): scaffold Cloudflare data worker + port libs + game-window gate"
```

---

## Task 2: `buildSnapshot` — fetch + normalize into the SPA's shapes

**Files:**
- Modify: `worker/src/snapshot.js`
- Test: `worker/src/snapshot.test.js`

**Interfaces:**
- Consumes: the verbatim libs (`createFootballDataClient`, `normalizeMatch`, `normalizeStandings`, `normalizeScorer`, `rankGroup`, `advancementStatus`, `bestThirds`, `HOST_CITIES`, `cityIdForMatch`, `channelsForMatch`).
- Produces: `buildSnapshot({apiKey: string, fetchImpl?: typeof fetch, now?: () => number}): Promise<{matches:{updatedAt,stale,matches:[]}, standings:{groups,bestThirdIds,updatedAt,stale}, scorers:{updatedAt,stale,scorers:[]}, reference:{hostCities:[]}}>`. Rejects if any upstream fetch fails.

- [ ] **Step 1: Write the failing test for `buildSnapshot`**

Add to `worker/src/snapshot.test.js`:
```js
import { buildSnapshot } from './snapshot.js';

// Minimal fake football-data v4 responses (raw upstream shapes).
function fakeFetch(rawByPath) {
  return async (url) => {
    const path = url.replace('https://api.football-data.org/v4', '');
    const body = rawByPath[path];
    return { ok: body !== undefined, status: body ? 200 : 404, json: async () => body };
  };
}

const RAW = {
  '/competitions/WC/matches': {
    matches: [{
      id: 537417, utcDate: '2026-06-28T19:00:00Z', status: 'TIMED', stage: 'LAST_32',
      group: null, matchday: null, venue: null,
      homeTeam: { id: 774, name: 'South Africa', tla: 'RSA', crest: 'rsa.png' },
      awayTeam: { id: 828, name: 'Canada', tla: 'CAN', crest: 'can.png' },
      score: { winner: null, fullTime: { home: null, away: null }, halfTime: { home: null, away: null } },
    }],
  },
  '/competitions/WC/standings': {
    standings: [{
      type: 'TOTAL', group: 'GROUP_A',
      table: [{ position: 1, team: { id: 769, name: 'Mexico', tla: 'MEX' }, playedGames: 3, won: 3, draw: 0, lost: 0, goalsFor: 6, goalsAgainst: 1, goalDifference: 5, points: 9 }],
    }],
  },
  '/competitions/WC/scorers': {
    scorers: [{ player: { name: 'Lionel Messi', nationality: 'Argentina' }, team: { id: 1, name: 'Argentina', tla: 'ARG', crest: 'arg.png' }, goals: 5 }],
  },
};

describe('buildSnapshot', () => {
  it('returns the SPA-shaped bundle with city + channels attached', async () => {
    const snap = await buildSnapshot({ apiKey: 'k', fetchImpl: fakeFetch(RAW), now: () => 1_000 });
    // matches slice
    expect(snap.matches.stale).toBe(false);
    expect(snap.matches.updatedAt).toBe(1_000);
    expect(snap.matches.matches).toHaveLength(1);
    const m = snap.matches.matches[0];
    expect(m.home.name).toBe('South Africa');
    expect(m.city?.id).toBe('los-angeles'); // match 537417 -> LA (matchVenues map)
    expect(m.channels).toBeTruthy();
    // standings slice
    expect(snap.standings.groups[0].table[0].team.name).toBe('Mexico');
    expect(Array.isArray(snap.standings.bestThirdIds)).toBe(true);
    // scorers + reference
    expect(snap.scorers.scorers[0].name).toBe('Lionel Messi');
    expect(snap.reference.hostCities.length).toBeGreaterThan(0);
  });

  it('rejects when an upstream fetch fails (so the cron keeps the prior snapshot)', async () => {
    await expect(buildSnapshot({ apiKey: 'k', fetchImpl: fakeFetch({}) })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd worker && npx vitest run src/snapshot.test.js`
Expected: FAIL — `buildSnapshot is not a function`.

- [ ] **Step 3: Implement `buildSnapshot` (append to `worker/src/snapshot.js`)**

Add these imports at the top of `worker/src/snapshot.js`:
```js
import { createFootballDataClient } from './lib/footballDataClient.js';
import { normalizeMatch, normalizeStandings, normalizeScorer } from './lib/normalize.js';
import { rankGroup, advancementStatus, bestThirds } from './lib/standings.js';
import { HOST_CITIES } from './lib/hostCities.js';
import { cityIdForMatch } from './lib/matchVenues.js';
import { channelsForMatch } from './lib/matchChannels.js';
```

Append:
```js
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd worker && npx vitest run src/snapshot.test.js`
Expected: PASS (6 tests total).

- [ ] **Step 5: Commit**

```bash
git add worker/src/snapshot.js worker/src/snapshot.test.js
git commit -m "feat(worker): buildSnapshot fetches + normalizes into the SPA's shapes"
```

---

## Task 3: `handleRequest` — read-only routing for `/api/*`

**Files:**
- Create: `worker/src/index.js`
- Test: `worker/src/index.test.js`

**Interfaces:**
- Produces: `handleRequest(req: Request, snap: object|null): Response` from `worker/src/index.js`. Routes `/api/matches|standings|scorers|reference|health`; adds CORS (`*`) and `Cache-Control: public, max-age=20, stale-while-revalidate=40`; returns empty-but-shaped `{stale:true,…}` payloads when `snap` is null; `404` otherwise.

- [ ] **Step 1: Write the failing test**

Create `worker/src/index.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { handleRequest } from './index.js';

const SNAP = {
  at: 1234,
  matches: { updatedAt: 1234, stale: false, matches: [{ id: 1 }] },
  standings: { groups: [{ group: 'GROUP_A' }], bestThirdIds: [9], updatedAt: 1234, stale: false },
  scorers: { updatedAt: 1234, stale: false, scorers: [{ name: 'Messi' }] },
  reference: { hostCities: [{ id: 'dallas' }] },
};
const get = (path) => new Request(`https://w.dev${path}`);

describe('handleRequest', () => {
  it('returns each slice with CORS + cache headers', async () => {
    const res = await handleRequest(get('/api/matches'), SNAP);
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('cache-control')).toContain('max-age=20');
    expect(await res.json()).toEqual(SNAP.matches);
  });
  it('routes standings, scorers, reference', async () => {
    expect(await (await handleRequest(get('/api/standings'), SNAP)).json()).toEqual(SNAP.standings);
    expect(await (await handleRequest(get('/api/scorers'), SNAP)).json()).toEqual(SNAP.scorers);
    expect(await (await handleRequest(get('/api/reference'), SNAP)).json()).toEqual(SNAP.reference);
  });
  it('serves empty-but-shaped payloads when the snapshot is missing', async () => {
    const res = await handleRequest(get('/api/matches'), null);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ updatedAt: null, stale: true, matches: [] });
  });
  it('404s an unknown path', async () => {
    expect((await handleRequest(get('/nope'), SNAP)).status).toBe(404);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd worker && npx vitest run src/index.test.js`
Expected: FAIL — `Failed to resolve import "./index.js"`.

- [ ] **Step 3: Implement `handleRequest` in `worker/src/index.js`**

Create `worker/src/index.js`:
```js
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd worker && npx vitest run src/index.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add worker/src/index.js worker/src/index.test.js
git commit -m "feat(worker): read-only /api/* routing with CORS + edge cache headers"
```

---

## Task 4: `runScheduled` + the Worker's default export (cron + fetch wiring)

**Files:**
- Modify: `worker/src/index.js`
- Test: `worker/src/index.test.js`

**Interfaces:**
- Consumes: `buildSnapshot`, `inGameWindow` (Task 1–2); `handleRequest` (Task 3).
- Produces: `runScheduled({env, nowMs, fetchImpl}): Promise<{skipped?,unchanged?,written?,error?}>` and a `default` export `{ scheduled, fetch }`. KV key is `snapshot:v1`. Writes only when the matches/standings/scorers signature changed.

- [ ] **Step 1: Write the failing test**

Add to `worker/src/index.test.js`:
```js
import { runScheduled } from './index.js';

// In-memory KV mock.
function kv(initial) {
  const store = new Map(initial ? [['snapshot:v1', JSON.stringify(initial)]] : []);
  return { store, get: async (k) => store.get(k) ?? null, put: async (k, v) => void store.set(k, v) };
}
const KO = '2026-06-29T18:00:00Z';
const koMs = Date.parse(KO);
const schedule = { matches: { matches: [{ id: 1, utcDate: KO, status: 'TIMED' }] } };

// fetchImpl that returns a one-match live snapshot (status from `status`).
function liveFetch(status, scoreHome) {
  return async (url) => {
    const p = url.replace('https://api.football-data.org/v4', '');
    const bodies = {
      '/competitions/WC/matches': { matches: [{ id: 1, utcDate: KO, status, stage: 'GROUP_STAGE', homeTeam: { id: 9, name: 'A' }, awayTeam: { id: 8, name: 'B' }, score: { winner: null, fullTime: { home: scoreHome ?? null, away: null }, halfTime: {} } }] },
      '/competitions/WC/standings': { standings: [] },
      '/competitions/WC/scorers': { scorers: [] },
    };
    return { ok: true, status: 200, json: async () => bodies[p] };
  };
}

describe('runScheduled', () => {
  it('no-ops when prior data exists and no match is in window', async () => {
    const env = { DATA: kv(schedule), FOOTBALL_DATA_API_KEY: 'k' };
    const r = await runScheduled({ env, nowMs: koMs - 60 * 60_000, fetchImpl: liveFetch('TIMED') });
    expect(r.skipped).toBe(true);
  });
  it('writes a snapshot when a match is in window', async () => {
    const env = { DATA: kv(schedule), FOOTBALL_DATA_API_KEY: 'k' };
    const r = await runScheduled({ env, nowMs: koMs + 30 * 60_000, fetchImpl: liveFetch('IN_PLAY', 1) });
    expect(r.written).toBe(true);
    const stored = JSON.parse(env.DATA.store.get('snapshot:v1'));
    expect(stored.matches.matches[0].score.home).toBe(1);
    expect(stored.at).toBe(koMs + 30 * 60_000);
  });
  it('skips the write when nothing changed', async () => {
    const env = { DATA: kv(schedule), FOOTBALL_DATA_API_KEY: 'k' };
    await runScheduled({ env, nowMs: koMs + 30 * 60_000, fetchImpl: liveFetch('IN_PLAY', 1) }); // first write
    const r = await runScheduled({ env, nowMs: koMs + 31 * 60_000, fetchImpl: liveFetch('IN_PLAY', 1) }); // same data
    expect(r.unchanged).toBe(true);
  });
  it('bootstraps when KV is empty even outside a window', async () => {
    const env = { DATA: kv(null), FOOTBALL_DATA_API_KEY: 'k' };
    const r = await runScheduled({ env, nowMs: koMs - 60 * 60_000, fetchImpl: liveFetch('TIMED') });
    expect(r.written).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd worker && npx vitest run src/index.test.js`
Expected: FAIL — `runScheduled is not a function`.

- [ ] **Step 3: Implement `runScheduled` + default export (append/extend `worker/src/index.js`)**

Add this import at the top of `worker/src/index.js`:
```js
import { buildSnapshot, inGameWindow } from './snapshot.js';
```

Append:
```js
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
```

- [ ] **Step 4: Run the full worker suite to verify it passes**

Run: `cd worker && npx vitest run`
Expected: PASS — all of `snapshot.test.js` + `index.test.js` (14 tests).

- [ ] **Step 5: Commit**

```bash
git add worker/src/index.js worker/src/index.test.js
git commit -m "feat(worker): cron runScheduled (gate + change-detected KV write) + default export"
```

---

## Task 5: Provision + deploy the Worker (Cloudflare)

**Files:**
- Modify: `worker/wrangler.toml` (paste the real KV namespace id)

> Prerequisite: a free Cloudflare account, and `npx wrangler login` completed in the `worker/` dir.

- [ ] **Step 1: Create the KV namespace**

Run: `cd worker && npx wrangler kv namespace create M26`
Expected: prints a binding block containing `id = "<hex>"`.

- [ ] **Step 2: Paste the id into `wrangler.toml`**

Replace `PLACEHOLDER_SET_IN_TASK_5` in `worker/wrangler.toml`'s `kv_namespaces` with the real `<hex>` id.

- [ ] **Step 3: Set the football-data key as a secret**

Run: `cd worker && npx wrangler secret put FOOTBALL_DATA_API_KEY`
Paste the key (the value of `FOOTBALL_DATA_API_KEY` from the repo root `.env`). Expected: "Success! Uploaded secret".

- [ ] **Step 4: Deploy**

Run: `cd worker && npx wrangler deploy`
Expected: prints the deployed URL, e.g. `https://mundial26-data.<account>.workers.dev`, and "Schedule: * * * * *". **Record this URL** — it's `WORKER_URL` below.

- [ ] **Step 5: Bootstrap KV + verify endpoints**

Trigger one scheduled run to populate KV (empty KV bootstraps regardless of window):
```bash
cd worker && npx wrangler dev --test-scheduled
# in another shell:
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```
Then verify the deployed read path:
```bash
curl -s "WORKER_URL/api/health"   # → {"ok":true,"at":<number>}
curl -s "WORKER_URL/api/matches" | head -c 200   # → {"updatedAt":…,"stale":false,"matches":[…
```
Expected: `health` has a non-null `at`; `matches` returns a populated array.

- [ ] **Step 6: Commit the wrangler.toml id**

```bash
git add worker/wrangler.toml
git commit -m "chore(worker): bind KV namespace + deploy config"
```

---

## Task 6: Point the SPA at the Worker (Render) and verify

> No code change — `src/api/client.js` already calls `${import.meta.env.VITE_API_URL}/api/*`. This is a build-time env swap on the Render **static** site. The Render Express service stays running as a rollback path.

- [ ] **Step 1: Set the env var on the static site**

In the Render dashboard → the `mundial26-app` (static) service → Environment → set `VITE_API_URL = WORKER_URL` (from Task 5, no trailing slash). Trigger a manual deploy (or push any commit) so Vite rebuilds with the new base.

- [ ] **Step 2: Verify the live site loads from the Worker**

Open `https://mundial26-app.onrender.com` in a fresh/incognito window. In DevTools → Network, confirm `matches`/`standings`/`scorers`/`reference` requests go to `WORKER_URL` (not `-y28p`) and return 200 instantly with no cold-start delay. Confirm the bracket, Today, Cities, Scorers, and Standings all render.

- [ ] **Step 3: No commit** (dashboard-only change). Note `WORKER_URL` in the project memory.

---

## Task 7: Simplify `useLiveData` — drop the stale-downgrade guard

**Files:**
- Modify: `src/hooks/useLiveData.js`
- Test: `src/hooks/useLiveData.test.js` (update if present; otherwise skip the test edits)

**Interfaces:**
- Produces: unchanged `useLiveData(key, fetcher) → { data, dataAsOf, error }`. The Worker never returns a stale fallback, so the guard that preserved `prev` on `fresh.stale` is removed; cache-first + replace remains.

- [ ] **Step 1: Check for and read the existing test**

Run: `ls src/hooks/useLiveData.test.js 2>/dev/null && grep -n "stale" src/hooks/useLiveData.test.js`
If a test asserts the stale-guard ("does not downgrade good data to a stale response"), delete that single test case in Step 2 along with the code; if no such file/test exists, skip the test deletion.

- [ ] **Step 2: Remove the stale guard in `src/hooks/useLiveData.js`**

Replace the `.then((fresh) => { … })` body so it always takes fresh data:
```js
      .then((fresh) => {
        if (!active) return;
        setError(null);
        writeCache(key, fresh);
        setData(fresh);
        setDataAsOf(Date.now());
      })
```
Delete the now-obsolete comment block above it that explains the "ancient fallback snapshot" downgrade.

- [ ] **Step 3: Run the hook tests + full suite**

Run: `npx vitest run src/hooks/useLiveData.test.js` (if it exists) then `npx vitest run`
Expected: PASS (any stale-guard test was removed in Step 1–2).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useLiveData.js src/hooks/useLiveData.test.js
git commit -m "refactor(spa): drop stale-downgrade guard — the edge worker never serves a stale fallback"
```

---

## Task 8: Delete the cold-start band-aids + the keep-warm workflow

**Files:**
- Modify: `src/App.jsx` (remove `ColdStartBanner` import + render)
- Modify: `src/api/client.js` (remove `begin()`/`end()` cold-start hooks)
- Delete: `src/components/ColdStartBanner.jsx`, `src/components/ColdStartBanner.css`, `src/lib/coldStart.js`, and any `coldStart`/`ColdStartBanner` test files
- Delete: `.github/workflows/data-refresh.yml`, `scripts/refresh.mjs`

- [ ] **Step 1: Remove the banner from `src/App.jsx`**

Delete the import line `import ColdStartBanner from './components/ColdStartBanner.jsx';` and the `<ColdStartBanner />` element in the returned JSX.

- [ ] **Step 2: Remove the cold-start hooks from `src/api/client.js`**

Delete the `import { begin, end } from './coldStart.js';` line and rewrite `getJson` without them:
```js
async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}
```

- [ ] **Step 3: Delete the dead files**

Run:
```bash
git rm src/components/ColdStartBanner.jsx src/components/ColdStartBanner.css src/lib/coldStart.js
git rm .github/workflows/data-refresh.yml scripts/refresh.mjs
# remove any cold-start tests if present:
git rm -f src/components/ColdStartBanner.test.jsx src/lib/coldStart.test.js 2>/dev/null || true
```

- [ ] **Step 4: Run the full suite + build to confirm nothing references the removed code**

Run: `npx vitest run && npx vite build`
Expected: all tests PASS, build succeeds. If a test imports a deleted file, delete that test.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(spa): remove cold-start banner, client hooks, and keep-warm workflow (now edge-served)"
```

---

## Task 9 (optional UX): Auto-refresh open tabs during a live match

**Files:**
- Modify: `src/hooks/useLiveData.js`
- Test: `src/hooks/useLiveData.test.js`

**Interfaces:**
- Produces: `useLiveData(key, fetcher, { refreshMs })` — an optional 3rd arg; when set, re-fetches on that interval. Used by views to keep an open tab current (poll the cheap static Worker, not the origin API).

- [ ] **Step 1: Write the failing test**

Add to `src/hooks/useLiveData.test.js`:
```js
import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
// ... within a describe:
it('re-fetches on the refresh interval when refreshMs is set', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockResolvedValue({ stale: false, matches: [] });
  renderHook(() => useLiveData('matches', fetcher, { refreshMs: 60_000 }));
  await vi.advanceTimersByTimeAsync(0);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(fetcher).toHaveBeenCalledTimes(2);
  vi.useRealTimers();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/hooks/useLiveData.test.js`
Expected: FAIL — fetcher called once, not twice (no interval yet).

- [ ] **Step 3: Add the interval to `useLiveData`**

Add `{ refreshMs } = {}` as the third parameter, and inside the effect (after the initial fetch wiring), schedule a repeat:
```js
    let timer = null;
    const tick = () => Promise.resolve().then(fetcher).then((fresh) => {
      if (!active) return;
      setError(null);
      writeCache(key, fresh);
      setData(fresh);
      setDataAsOf(Date.now());
    }).catch((e) => { if (active) setError(e?.message ?? String(e)); });
    tick();
    if (refreshMs) timer = setInterval(tick, refreshMs);
    return () => { active = false; if (timer) clearInterval(timer); };
```
(Replace the existing one-shot `Promise.resolve().then(fetcher)…` block and its cleanup with the above; key the effect on `[key, refreshMs]`.)

- [ ] **Step 4: Wire TodayView to poll while live**

In `src/views/TodayView.jsx`, pass a refresh interval to the matches feed:
```js
  const { data, dataAsOf, error } = useLiveData('matches', getMatches, { refreshMs: 60_000 });
```

- [ ] **Step 5: Run tests + build**

Run: `npx vitest run && npx vite build`
Expected: PASS, build OK.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useLiveData.js src/hooks/useLiveData.test.js src/views/TodayView.jsx
git commit -m "feat(spa): auto-refresh open tabs every 60s (polls the static edge snapshot)"
```

---

## Task 10: Retire the Render Express service

> Do this only after a full match cycle has been observed working through the Worker (Task 6 verified live + a real game refreshed via the cron).

- [ ] **Step 1: Suspend (don't delete) `mundial26-y28p`**

In the Render dashboard → `mundial26-y28p` web service → Suspend. Watch one live match window; confirm the site still updates (data now comes from the Worker, not this service).

- [ ] **Step 2: Delete the service**

Once confident, delete `mundial26-y28p` in Render. The `server/` code stays in-repo (it's the source the Worker ported from and still carries its unit tests).

- [ ] **Step 3: Update project memory**

Record in `project_mundial26.md`: data now served by the Cloudflare Worker `mundial26-data` (`WORKER_URL`), KV key `snapshot:v1`, cron `* * * * *` game-gated; Render Express `-y28p` retired; SPA `VITE_API_URL` → `WORKER_URL`.

---

## Self-Review

**Spec coverage:**
- Worker `scheduled` (gate → fetch → normalize → KV) → Tasks 1, 2, 4. ✓
- Worker `fetch` (read KV → slice → CORS/cache) → Task 3. ✓
- KV schema `snapshot:v1` → Task 4. ✓
- No-op gate outside game windows + bootstrap → Tasks 1, 4. ✓
- Code reuse from `server/` (6 self-contained modules) → Task 1. ✓
- Secrets/bindings/cron config → Tasks 1, 5. ✓
- SPA data-source swap (`VITE_API_URL`) → Task 6. ✓
- Delete stale-guard / banner / client hooks / keep-warm workflow → Tasks 7, 8. ✓
- Open-tab refresh → Task 9. ✓
- Retire Express → Task 10. ✓
- Phased + reversible rollout (Worker → repoint → cleanup → retire) → task ordering + Task 6 keeps `-y28p` alive. ✓
- Free-tier budgets (≤4 calls/min, write-on-change) → Global Constraints + Task 4 `signature` gate. ✓

**Placeholder scan:** No "TBD/TODO/handle edge cases". The single intentional placeholder (`PLACEHOLDER_SET_IN_TASK_5` in `wrangler.toml`) is explicitly resolved in Task 5 Step 2. ✓

**Type consistency:** `inGameWindow(matches, nowMs)`, `buildSnapshot({apiKey,fetchImpl,now})`, `handleRequest(req, snap)`, `runScheduled({env,nowMs,fetchImpl})`, KV key `snapshot:v1`, and the `{updatedAt,stale,matches}` / `{groups,bestThirdIds,…}` / `{updatedAt,stale,scorers}` / `{hostCities}` shapes are used identically across Tasks 2–4 and match the current API (verified against `server/dataService.js` + `server/routes.js`). ✓
