# Mundial26 — Handoff / resume doc

Last updated: **2026-07-21 — THE PROJECT IS ARCHIVED.** The 2026 World Cup is over
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
- Remaining human tasks: delete the dead `VITE_API_URL` env on Render
  `mundial26-app`; decide the Workers-Paid downgrade before ~Aug 13 (other apps'
  Workers still use the account).

## What it is
A live FIFA World Cup 2026 tracker, built to be exciting + understandable for soccer
newcomers, in a retro Panini sticker-album look. React 18 + Vite SPA. Repo:
`github.com/theonenonlyvj/Mundial26`. Current Hermes checkout used for the 2026-07-05
mobile footer fix is `/home/alistar/work/Mundial26`; Vijay's older Mac-local path in
prior notes was `/Users/vijayram/Cursor/mundial26`.

## Architecture (HISTORICAL — live-era, 2026-06-30 → 2026-07-21; backend now deleted)
```
football-data.org (free tier, server-side key)
        ▼
Cloudflare Worker "mundial26-data"   (account: theonenonlyvj)
   ├─ scheduled cron "* * * * *": shouldRefresh? → fetch → normalize → write KV snapshot
   │                              + append every changed match to D1 log
   └─ fetch: serve /api/matches|standings|scorers|reference|health from KV; /api/log from D1
        ▼
Render STATIC site "mundial26-app"  →  PUBLIC URL: https://mundial26-app.onrender.com
   └─ React SPA, VITE_API_URL = the Worker URL (baked at build); localizes time client-side
```
- Worker URL: **https://mundial26-data.theonenonlyvj.workers.dev**
- The OLD Render Express service **`mundial26-y28p`** is **ORPHANED** (nothing calls it).
  Kept only as a rollback parachute. **Open task: retire it** (suspend → watch a live
  match cycle → delete). Rollback if ever needed = set Render `mundial26-app` env
  `VITE_API_URL` back to `https://mundial26-y28p.onrender.com` and redeploy.

## Cloudflare resources (HISTORICAL — all deleted 2026-07-21)
- Worker: `mundial26-data` (wrangler v3; config `worker/wrangler.toml`).
- KV namespace (live snapshot): binding `DATA`, id `ec901d6b56964e9499b00dea8c5f0dda`,
  key `snapshot:v1`.
- D1 database (log): binding `LOGDB`, name `mundial26-log`, id
  `96d3c403-c678-479f-9e76-bc5011bc964d`, table `match_log` (schema `worker/schema.sql`).
- Secret: `FOOTBALL_DATA_API_KEY` (set via `wrangler secret put`). The raw key is also in
  the repo-root `.env` (gitignored) for local scripts.
- Cron trigger: `* * * * *` (every minute; no-ops when no game is in/near a window).

## How to deploy / run
- **Worker:** `cd worker && npx wrangler deploy` (requires `npx wrangler login` once;
  Vijay's account is logged in on his Mac). Ignore the "update to wrangler v4" nag —
  staying on v3 deliberately (v4 changes config format).
- **SPA:** push to `main` → Render auto-deploys the static site (~1–2 min). `VITE_API_URL`
  is a build-time env on the Render `mundial26-app` service.
- **Tests/build:** root (SPA + worker library tests) = `npm test` and `npm run build`.
  Worker-only deploy/test commands still run from `worker/`. As of 2026-07-05:
  **174 root tests pass** and `npm run build` passes.
- **Query the log:** `https://mundial26-data.theonenonlyvj.workers.dev/api/log?match=<id>&limit=N`
  (JSON, newest first), or raw SQL:
  `cd worker && npx wrangler d1 execute mundial26-log --remote --command "SELECT ..."`.

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
"Netherlands win 3-1" reading Vijay saw was a transient bad reading.

## Open threads / TODO — ALL CLOSED OR MOOT at archive (2026-07-21)
- [x] ~~Retire `mundial26-y28p`~~ — deleted by Vijay 2026-07-01.
- [x] ET/Penalties question — answered by the archived log (`docs/final-data/match_log.json`):
      the feed does carry `duration` (the final logs as `EXTRA_TIME`).
- [x] Everything else (cache-buster, Logs page, council backlog, Cards tab — see
      `docs/cards-feature-spike.md` on branch `maybe-penalties`) — moot; tournament over.
- [ ] Human: delete dead `VITE_API_URL` env on Render; Workers-Paid downgrade decision (~Aug 13).

## Current operator expectations
- Vijay/theonenonlyvj has active users on these apps. Only push high-confidence,
  small, reversible commits after tests/build and a diff review.
- Keep docs/notes updated enough for a fresh agent to continue without chat history.

## Gotchas for the agent
- **cwd resets between shell/tool calls** — always set the repo cwd explicitly. On this
  Hermes host use `/home/alistar/work/Mundial26`; on Vijay's Mac use the older
  `/Users/vijayram/Cursor/mundial26` path if that checkout is still present. Use
  `worker/` only for Worker-specific deploy/test commands.
- **A PreToolUse hook blocks writes/`/dev/null` redirects outside `/Cursor`** — don't use
  `2>/dev/null`; write temp files into the session scratchpad or the repo.
- **Don't re-read a subagent's raw `.output` transcript via shell** — it overflows context.
- Run `npm`/`wrangler`/`vitest` from the right dir (root for SPA, `worker/` for the Worker).
- The project memory file (auto-loaded each session) has the running narrative; this doc + the
  blueprint are the durable, repo-versioned source of truth.
