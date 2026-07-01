# Sports-Logic Correctness Audit — 2026-07-01

Trigger: "How is Mexico already labeled the winner and shown in the Round of 16?!
The game's not even over yet." Goal: bulletproof the existing result/advancement
logic (no new features), find every sibling of that bug, write it all down.

## The one principle behind every bug here

**The football-data feed emits PROVISIONAL values on a live match. Never treat
non-final state as decided.**

A result is real only when the match `status ∈ {FINISHED, AWARDED}`. A group is
"complete" only when *all* its matches are finished. Anything that can still
change before the whistle — the winner, standings points/played, a shootout
line, a "Through/Out" badge, bracket advancement — must be gated on that.

## Root cause (proven, not guessed)

The worker's own D1 `match_log` recorded every state transition. Mexico–Ecuador
(match `537425`, a **Round-of-32** tie) shows the feed setting a winner off the
*current scoreline* while the game was live:

```
02:27:30 | LAST_32 | LIVE     | 1-0 | winner=HOME_TEAM
02:36:30 | LAST_32 | LIVE     | 2-0 | winner=HOME_TEAM   ← game NOT over
02:56:52 | LAST_32 | PAUSED   | 2-0 | winner=HOME_TEAM
04:07:52 | LAST_32 | FINISHED | 2-0 | winner=HOME_TEAM   ← only now is it real
```

It even reports `winner=DRAW` at 0-0. Same pattern on FRA-SWE (537416) and
CIV-NOR (537424). `bracketTree.js` read `fd.score.winner` with **no FINISHED
gate**, so the still-leading side was propagated into the next knockout round.

Query it yourself: `GET /api/log?match=537425` (or `?limit=N` for all).

## Fixes shipped (all deployed)

| # | Fix | File | Commit / worker ver |
|---|-----|------|---------------------|
| 1 | Null `score.winner` unless `FINISHED`/`AWARDED` — the chokepoint, so no consumer *can* misread a live leader as the result | `worker/src/lib/normalize.js` | `51cb014` / `0d53cb8c` |
| 2 | Gate bracket winner/loser propagation on `DONE.has(status)` (defense-in-depth; the bracket must never advance off a non-final result) | `src/lib/bracketTree.js` | `51cb014` |
| 3 | Only show "Decided on penalties (…)" once `FINISHED` (a live shootout was rendering it before anyone had won; the live "Penalties" phase chip already covers in-progress) | `src/components/MatchSticker.jsx` | `a3b2980` |
| 4 | Compute clinch/elimination from points/played **secured from FINISHED group matches only** (`securedGroupStats`), and take "group complete" from real match statuses — never the feed's premature `played>=3` | `worker/src/lib/standings.js`, `worker/src/snapshot.js` | `a3b2980` / `06ce28ba` |

Every fix has a regression test that feeds the exact non-final input and asserts
no decided output (root suite 168, worker suite 51, all green).

## Adversarial review (workflow `wf_6b19aa9b-e33`)

5 parallel reviewers → 9 findings → 7 distinct → each adversarially verified.
**2 CONFIRMED** (fixes #3 and #4 above). The rest were rejected — and the
rejections are useful, so they're recorded here:

- `bracketTree.js` winner (line ~65) and loser (line ~66) — **REJECTED because
  already fixed** by fix #1/#2. The verifier fed the identical MEX-ECU live input
  and confirmed nothing propagates. Good independent cross-check.
- `standings.js:21` / `normalize.js:95` (standings played/points passthrough) —
  **REJECTED as "premise unproven"**: we have hard forensic proof the *matches*
  feed is provisional (the winner log above), but **no** evidence the *standings*
  endpoint bumps `playedGames`/`points` before a match finishes. Fix #4 hardens
  it anyway (see below).

## What was intentionally NOT changed

- The **live standings table** still shows the feed's live points/GD (it updates
  during a game). Only the definitive **clinch/elimination badges** now wait for
  games to actually finish. Rationale: a table reflecting the live score is
  expected; a definitive "Through 🎉 / Eliminated" off a live game is the bug.

## Residual risks / notes

- **Fix #4 is safe hardening regardless of whether the standings endpoint is
  provisional.** If the feed already counts only finished games, `securedGroupStats`
  equals the feed → no change. If it's provisional, secured corrects it. It can't
  regress a correct feed.
- **Undercount edge:** `securedGroupStats` only tallies finished matches that
  carry a `group` and both team `id`s. If the feed ever omits those on a finished
  match, a genuinely-clinched team could briefly show `alive` instead of `through`.
  Low risk (finished matches reliably carry group + team ids). When the match list
  isn't threaded in, `advancementStatus` falls back to the feed (back-compat).
- **`preserveDecided`** (worker) already correctly requires `FINISHED`/`AWARDED`
  before protecting a "settled" result — verified, not a leak.

## Diagnostic tooling (use these next time, before guessing)

- `GET /api/log?match=<id>&limit=N` — D1 log of every match state change. This is
  what turned "why is Mexico the winner?" into a five-minute root cause.
- `GET /api/statuslog` — timeline of the raw status vocabulary the feed emits.
- `cd worker && npx wrangler tail` — live cron logs (raw statuses each tick; warns
  on any unmapped status).

## The rule to carry forward (incl. the future F1 tracker)

Trust the **score/scoreline** for "what's happening right now." Never trust the
feed's **winner, standings points/played, penalties, or advancement** until the
match is `FINISHED`/`AWARDED` (or, for a group, until every match in it is). The
feed's live fields are provisional by design.
