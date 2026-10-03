# Mundial26 — Handoff / resume doc

Status: **THE PROJECT IS ARCHIVED.** The 2026 World Cup is over
(**Spain 1-0 Argentina**, in extra time; England 3rd; Mbappé Golden Boot with 10).
The generalizable lessons are in [BLUEPRINT.md](./BLUEPRINT.md) — **read §9–10 for
the outage postmortem and the end-of-life/archive playbook**; this doc is the
concrete record.

## ⚱️ ARCHIVED STATE (2026-07-21) — read this first
- The site is a **permanent, fully self-contained static archive** at
  https://mundial26-app.onrender.com — bundled final data, ZERO network calls,
  archive ribbon + final-results meta. It needs **no backend, no key, no cron, $0**.
- **The entire Cloudflare backend was DELETED 2026-07-21** (verified): Worker
  `mundial26-data` (+ its cron + `FOOTBALL_DATA_API_KEY` secret), KV namespace
  `ec901d6b56964e9499b00dea8c5f0dda`, D1 `mundial26-log`. The Worker URL now 404s
  (error 1042). Sections below describing the Worker/KV/D1 are **historical**.
- All data preserved in-repo: final API payloads in `src/data/final/*.json`; the
  full 528-row D1 game log + 147-entry status-vocab log in `docs/final-data/`.
- Archive mechanism: `src/archive.js` (flag) + a short-circuit in
  `src/api/client.js getJson` (every consumer goes static at one chokepoint);
  seed beats visitor cache; polling off. Un-archive = flip one flag (needs a new
  data source). Deploys: push to `main` → Render static, unchanged.
- There are no remaining repository operations. A stale `VITE_API_URL` build
  value is unreachable in archive mode and was deliberately left alone.

## What it is
A FIFA World Cup 2026 tracker, built to be exciting and understandable for
soccer newcomers in a retro sticker-album look. It is a React 18 + Vite SPA,
now frozen as a static final-results archive.

## Architecture (HISTORICAL — live-era, 2026-06-30 → 2026-07-21; backend now deleted)
```
football-data.org (free tier, server-side key)
        ▼
Cloudflare Worker "mundial26-data"
   ├─ scheduled cron "* * * * *": shouldRefresh? → fetch → normalize → write KV snapshot
   │                              + append every changed match to D1 log
   └─ fetch: serve /api/matches|standings|scorers|reference|health from KV; /api/log from D1
        ▼
Render STATIC site "mundial26-app"  →  PUBLIC URL: https://mundial26-app.onrender.com
   └─ React SPA, VITE_API_URL = the Worker URL (baked at build); localizes time client-side
```
- The former Worker endpoint is retired and no longer part of the site.
- The old Express service and the later Worker stack were both retired. They
  are not rollback targets for the static archive.

## Cloudflare resources (HISTORICAL — all deleted 2026-07-21)
- Worker: `mundial26-data` (wrangler v3; historical config in `worker/wrangler.toml`).
- KV binding: `DATA`, snapshot key `snapshot:v1`.
- D1 binding: `LOGDB`, table `match_log` (schema `worker/schema.sql`).
- Secret: `FOOTBALL_DATA_API_KEY`, deleted with the backend.
- Cron trigger: `* * * * *` (every minute; no-ops when no game is in/near a window).

## How to run and verify

- Root SPA: `npm run dev`, `npm test`, and `npm run build`.
- Historical worker library tests may be run locally from `worker/` with
  `npm test`.
- **Never run a Wrangler deployment command for this repository.** The Worker,
  cron, KV, D1, and secret were deliberately deleted. The exported logs in
  `docs/final-data/` replace remote log queries.

## Key files
- `worker/src/snapshot.js` — `shouldRefresh` (gate: live window OR unsettled knockout ≤24h),
  `isDecisive`, `buildSnapshot` (fetch+normalize into the SPA's shapes), `inGameWindow`→renamed.
- `worker/src/index.js` — `runScheduled` (cron body: gate → buildSnapshot → `preserveDecided`
  → log changes → write KV), `signature` (write-on-change), `changedMatches`, `logChanges`,
  `handleRequest` (/api/* slices), `handleLog` (/api/log), default export `{ scheduled, fetch }`.
- `worker/src/lib/*` — VERBATIM copies of `server/*` (normalize, standings, footballDataClient,
  hostCities, matchVenues, matchChannels). **If you edit one, edit BOTH (worker + server) to
  keep them in sync** — they drift silently otherwise.
- `src/lib/knockoutDisplay.js` + `src/lib/bracketTree.js` + `src/data/bracket2026.js` —
  bracket: SCHEDULE-anchored (round + `SLOT_CITY` + `SLOT_DATE`), `sideDisplay` resolves a
  side to team / seed-label / "A or B" / "Winner R32".
- `src/components/MatchSticker.jsx` + `TeamSticker.jsx` — the ONE shared match card (used by
  Today, Timeline, Cities, Standings/bracket). `TeamSticker` renders display kinds
  team/slot/either; **the match's own team (API answer) wins over a computed display.**
- `src/lib/livePhase.js` — 1st/2nd half, Halftime, Extra time, Penalties, from status + `score.duration`.
- `src/hooks/useLiveData.js` — cache-first + 60s auto-refresh; `useKnockoutDisplay.js`.
- `docs/superpowers/specs|plans/2026-06-29-static-edge-data*.md` — the edge-data migration spec+plan.

## Recent saga (so you don't re-debug it)
The hard month-end fights, all fixed + in git history:
1. **Edge-data migration** — moved off the sleeping Render API onto the Worker (specs/plans).
2. **Penalty shootouts** — feed reports `winner:null` + aggregate `fullTime`; normalize derives
   the winner + penalties; card shows "X win A–B on penalties".
3. **FINISHED-freeze** — cron stopped refetching at first FINISHED → froze a transient wrong
   result. Gate now chases unsettled knockouts up to 24h.
4. **Result regression / downgrade** — a decided result got overwritten by later garbage.
   `preserveDecided` blocks decided→no-winner ONLY when the score is unchanged (a real change /
   VAR call-back is always taken).
5. **Bracket advancer + render gotcha** — R16 showed "A or B" after a match decided; fixed by
   resolving to the winner AND teaching `TeamSticker` to render a `kind:'team'` display (it
   previously fell through to "TBD"). LESSON: verify the render, not just the data.
6. **D1 game-state log** — added `/api/log`; logs every change.
7. **Mobile footer blank-space fix (2026-07-05)** — Safari/tall mobile viewports with
   short content could show the feedback footer in the middle of the page with a large
   beige blank area below it. Root cause: the app shell was block layout with no
   viewport-height floor, so short pages ended before the viewport did. Fix: `.app` is
   now a column flex shell with `min-height: 100vh` + `100dvh`, and `.app__main` grows
   with `flex: 1` / `width: 100%`. Regression test: `src/theme/global.test.js`.
   Verification: `npm test`, `npm run build`, and a 1320×2400 headless Chrome mobile
   measurement showed `spaceAfterFooter: 0`, `scrollHeight: 2400`, footer bottom `2400`.
NOTE: NED–MAR's true result is **Morocco won 3-2 on pens** (per football-data, settled). A
"Netherlands win 3-1" reading reported during the event was a transient bad reading.

## Open threads / TODO — ALL CLOSED OR MOOT at archive (2026-07-21)
- [x] ~~Retire `mundial26-y28p`~~ — deleted during the live-event cleanup.
- [x] ET/Penalties question — answered by the archived log (`docs/final-data/match_log.json`):
      the feed does carry `duration` (the final logs as `EXTRA_TIME`).
- [x] Everything else (cache-buster, Logs page, council backlog, Cards tab — see
      `docs/cards-feature-spike.md` on branch `maybe-penalties`) — moot; tournament over.
- [x] `VITE_API_URL` cleanup deliberately skipped because archive mode makes it
      unreachable; provider-plan decisions belong outside this repository.

## Current maintainer expectations

- Keep changes small and reversible, and run tests/build before publication.
- Keep the archive self-contained and update repo-native documentation when
  architecture or verification changes.

## Maintainer gotchas

- Run SPA commands from the repository root and historical worker tests from
  `worker/`.
- Do not mistake historical live-era instructions in old plans for current
  operations. The archive and blueprint are the durable sources of truth.

## Post-archive corrections

Two corrections to the "Remaining human tasks" / "Open threads" lines above.
Both come from the tail of the archive session (2026-07-21), *after* this doc
was last edited — so the list above overstates what is actually open.

- **`VITE_API_URL` — closed, deliberately unchanged.** `src/api/client.js`
  does still read `VITE_API_URL` into `BASE`, so the string is baked into the
  bundle — but that fetch path is unreachable: every data call short-circuits
  to the bundled archive inside `getJson` before touching the network, and the
  Worker 404s anyway. Deleting the env var without a rebuild changes nothing
  about the served site, and there is no reason to ever build again. The
  earlier "provably backend-free" framing was hygiene, not a real task.
- **Provider-plan decisions are outside this archived project.** The shared
  account limit lesson remains reusable in `BLUEPRINT.md` §9, but no billing
  or infrastructure action belongs in this repository.
