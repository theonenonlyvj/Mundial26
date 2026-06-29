# Mundial26 — Static Edge-Data Architecture

**Date:** 2026-06-29
**Status:** Design — awaiting review
**Author:** Vijay + Claude

## 1. Problem

The data shown to every visitor is **identical** — the only per-user things are which
tab is open and the viewer's local timezone, both computed in the browser. Yet the SPA
currently fetches live data at runtime from a separate Express API on Render's free tier.
That service **sleeps**, so we bolted on a pile of band-aids to hide its cold starts:
a bundled seed snapshot, a localStorage cache, a stale-downgrade guard, a "server is
waking up" banner, and a keep-warm cron. All of it exists to paper over one thing — a
sleeping service in the user's request path.

## 2. Goal

Serve the data as a **pre-computed snapshot from the edge**, refreshed by a job that only
runs during games. No live service in the request path → **never a cold start, never a
stale fallback, the same bytes for everyone**. Delete the band-aids.

### Non-goals
- Real-time/minute-by-minute scores. football-data's free tier has **no live-minute clock**
  and lags ~2–5 min; that is the hard floor for freshness regardless of architecture.
- Per-user/server-rendered pages. The SPA stays; only its *data source* changes.
- Changing the public URL. The page stays at `https://mundial26-app.onrender.com`.

## 3. Architecture

```
┌─ Cloudflare Worker (free) ─────────────────────────────────────────┐
│  scheduled  (cron, every 1 min)                                    │
│     └─ gate: is any match live/imminent (from stored schedule)?    │
│          • no  → exit in ms (no football-data call)                │
│          • yes → fetch football-data → normalize → write KV        │
│  fetch      (per HTTP request)                                     │
│     └─ read latest snapshot from KV → return JSON (CORS + cache)   │
└────────────────────────────────────────────────────────────────────┘
            ▲ writes                              ▲ reads
       football-data.org                     Render static SPA
       (server-side key)                 mundial26-app.onrender.com
                                          (URL unchanged; browser
                                           localizes times client-side)
```

Two independent triggers, never interfering: the **cron only writes**, the **request
handler only reads**. So 1 visitor or 10,000 is just KV reads — no origin work, no cold
start, no football-data calls on the read path.

## 4. Component A — Cloudflare Worker

A single Worker (`mundial26-data`) with two handlers and one KV namespace.

### 4.1 KV schema
One namespace `M26` (binding `DATA`). Single key:

- `snapshot:v1` → the full normalized bundle:
  ```json
  { "at": <epoch ms>, "matches": {…}, "standings": {…}, "scorers": {…}, "reference": {…} }
  ```
  Sub-objects keep the **exact shapes the SPA already consumes** (`{updatedAt, stale,
  matches}`, etc.), so the front end needs no reshaping.

(One key keeps writes/reads minimal and the snapshot internally consistent — matches,
standings, and bracket always reflect the same fetch.)

### 4.2 `scheduled` handler (cron `* * * * *`, every minute)
Mirrors today's `scripts/refresh.mjs` gate, but writes KV instead of committing git:

1. Read `snapshot:v1` from KV (gives last-known fixtures + statuses + `at`).
2. **Gate (no football-data call yet):** is `now` within `[kickoff − 12 min, kickoff +
   240 min]` for any match whose last-known status ≠ `FINISHED`/`AWARDED`?
   - **No** → exit immediately. (Outside game windows the cron is a free no-op heartbeat.)
   - **Yes** → continue.
3. Fetch `/matches` from football-data (1 call). If any status/score changed vs. stored,
   also fetch `/standings` and `/scorers`. `reference` (fixtures/venues/channels) is static
   — fetch only when missing or absent from KV.
4. Normalize (reuse ported code, §4.4) and write `snapshot:v1` **only if changed**.
5. Bootstrap: if KV is empty (first run ever), fetch the full set once and write.

football-data calls: ~1/min idle-in-window, up to ~4/min on a scoring event — far under
the free 10 req/min limit. Outside windows: **zero** calls.

### 4.3 `fetch` handler (per request)
Read-only. Routes mirror today's API so the SPA change is just a base URL:

- `GET /api/matches` → `snapshot.matches`
- `GET /api/standings` → `snapshot.standings`
- `GET /api/scorers` → `snapshot.scorers`
- `GET /api/reference` → `snapshot.reference`
- `GET /api/health` → `{ ok: true, at }`

Each: read `snapshot:v1`, return the slice with:
- `Access-Control-Allow-Origin: *` (public read-only sports data; may lock to the Render
  origin if preferred),
- `Cache-Control: public, max-age=20, stale-while-revalidate=40` so Cloudflare's edge
  serves bursts without re-invoking the Worker, while staying within the freshness budget.

If KV is empty (pre-bootstrap), return `200` with `{ stale: true, … }` empty-ish payload;
the SPA falls back to its bundled seed for that brief window.

### 4.4 Code reuse
Port these **plain-JS** modules from `server/` into the Worker bundle (no Node APIs needed
except swaps noted):
- `footballDataClient.js` (uses global `fetch`; key from `env` not `process.env`),
- `normalize.js`, `standings.js`,
- static maps: `data/matchVenues.js` (`MATCH_CITY`), `data/matchChannels.js`,
  `data/hostCities.js`, `data/groups.js`.
Drop `dataService.js`'s `readFileSync` snapshot fallback (KV replaces it).

### 4.5 Config / secrets
- `wrangler secret put FOOTBALL_DATA_API_KEY` (server-side only; never shipped to browser).
- KV namespace `M26` bound as `DATA`.
- Cron trigger `* * * * *` in `wrangler.toml`.

## 5. Component B — Render static SPA

### 5.1 The one required change
Set `VITE_API_URL` (already the build-time data base, see `src/api/client.js`) to the
Worker URL and rebuild. `client.js` already calls `${BASE}/api/matches` etc., so **no
other front-end wiring changes**.

### 5.2 Deletions (the band-aids)
- `src/components/ColdStartBanner.jsx` (+ css) and its `coldStart.js` begin/end hooks.
- The stale-downgrade guard in `src/hooks/useLiveData.js` — the Worker never returns a
  "stale fallback", so the guard's reason to exist is gone. Keep cache-first + replace.
- `.github/workflows/data-refresh.yml` + `scripts/refresh.mjs` (replaced by the Worker cron).

### 5.3 What stays
- Bundled `seed.json` as the **synchronous first-paint** value (offline/empty-KV insurance).
  It is no longer a "live fallback", just the initial render before the first edge fetch.
- localStorage cache-first repaint, FreshnessNote ("scores as of …", now driven by
  `snapshot.at`), all client-side timezone/bucketing.

## 6. Component C — Retire the Render Express service

Once the SPA reads from the Worker and is verified, **suspend then delete** the
`mundial26-y28p` web service. The `server/` code stays in-repo as the source the Worker
ports from (and for its unit tests). Render keeps **only the static site**.

## 7. Freshness & latency budget

| Stage | Added latency |
|---|---|
| football-data inherent lag (no live clock) | ~2–5 min (floor) |
| cron poll interval | ≤ 1 min |
| KV write→read propagation (eventual) | ≤ ~60 s |
| edge `max-age` | ≤ 20 s |

**Net during a live match: ~2–5 min behind reality** — i.e. essentially the floor set by
the data source. Open tabs re-poll every ~30–60 s so scores update without reload. Fresh
loads paint the current snapshot instantly from the edge.

## 8. Free-tier budget

- **Workers:** 100k req/day shared by cron + reads. Cron = 1,440/day. Reads scale with
  (small) traffic. Comfortably under.
- **KV:** 100k reads/day, **1k writes/day**. Writes happen only on change during games
  (~hundreds/day worst case) — under the write cap. Snapshot ≪ 25 MB value limit.
- **Workers CPU:** normalization of ~104 matches is sub-millisecond; well under the 10 ms
  free CPU/invocation. (football-data fetch is I/O, not CPU.)
- **football-data:** ≤ ~4 calls/min in-window, 0 out of window — under 10/min free tier.

## 9. Testing

- **Reused unit tests:** `normalize`, `standings` tests move/stay with the ported modules.
- **New Worker tests:** the gate (live/imminent detection from a stored snapshot →
  fetch-or-noop), and the route→slice mapping. Run via `vitest` against the handler funcs
  (pure), plus a `wrangler dev` smoke test with a mocked football-data response.
- **SPA:** existing 154 tests must stay green after deletions; update/remove tests tied to
  ColdStartBanner and the stale-guard.

## 10. Rollout (phased, reversible)

1. **Build + deploy Worker.** Verify `/api/*` returns correct JSON and the cron refreshes
   `snapshot:v1` during a live window (use `workflow_dispatch`-style manual cron / `wrangler
   dev --test-scheduled`).
2. **Point SPA at Worker** (`VITE_API_URL` → Worker), redeploy static. Verify the live site
   loads from the edge with no cold start. *(Render Express still running as fallback.)*
3. **Delete band-aids** (banner, stale-guard, keep-warm workflow), redeploy.
4. **Retire Render Express** (`-y28p`): suspend, watch a match cycle, then delete.

**Rollback:** at any step, revert `VITE_API_URL` to the Render API URL and redeploy; keep
`-y28p` suspended-not-deleted until Phase 4 confidence.

## 11. Risks / open questions

- **New platform.** One free Cloudflare account + `wrangler`. One Worker, set-and-forget.
- **KV eventual consistency** adds ≤ ~60 s; inside budget. (Cache API is an option if we
  ever want tighter, but not needed.)
- **Cron fires every minute 24/7** but no-ops outside games. If we'd rather it not fire at
  all off-hours, scope the cron expression to match-day UTC windows — minor, optional.
- **CORS scope:** `*` vs. locking to the Render origin. Default `*` (public data); trivial
  to tighten.
- **football-data key** lives as a Worker secret — same trust model as today's server.

## 12. File-level change summary

**New (Cloudflare Worker project, e.g. `worker/`):**
- `worker/wrangler.toml` (KV binding, cron trigger)
- `worker/src/index.js` (`scheduled` + `fetch` handlers, gate, routing)
- `worker/src/lib/*` (ported `footballDataClient`, `normalize`, `standings`, static maps)
- `worker/src/*.test.js` (gate + routing)

**Changed (SPA):**
- Render env: `VITE_API_URL` → Worker URL (build-time)
- `src/hooks/useLiveData.js` — drop stale-guard, keep cache-first
- `src/api/client.js` — remove the `begin()`/`end()` cold-start hooks (it imports them
  from `coldStart.js`); the `${BASE}/api/*` calls are otherwise unchanged
- `src/App.jsx` — remove the `ColdStartBanner` import + render

**Removed:**
- `src/components/ColdStartBanner.jsx` (+ css), `src/lib/coldStart.js`
- `.github/workflows/data-refresh.yml`, `scripts/refresh.mjs`
- (Phase 4) Render `mundial26-y28p` service
