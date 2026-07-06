# Cards feature — spike result: NOT buildable on the current data plan

**Date:** 2026-07-06 · **Branch:** `maybe-penalties` · **Status:** **SHELVED** (Vijay,
2026-07-06). No feature code was written — this is a data-availability spike only.

## What was asked
A **Cards** tab ranking teams by red cards, then yellow cards, with an elimination-status
column (still alive / which round they went out). Product name must be **Cards** (not
"Penalties"/"Discipline"). Full spec is in the handoff Vijay forwarded (proposed
`/api/cards` endpoint, a slow `cards:v1` KV backfill, `CardsView`, etc.). The handoff's
own first task was: *confirm whether card data is available before implementing.* It isn't.

## The blocker
**football-data.org's free tier returns no card data for the World Cup.** There is no
source to build the feature on, so — per this project's data-fidelity rule (never
fabricate/estimate) — the tab was shelved rather than filled with guessed numbers. This is
the same reason it was "held" earlier; now it's proven at the source instead of assumed.

## Evidence (authenticated probes at the source, 2026-07-06)
Live key against `https://api.football-data.org/v4`, rate budget healthy throughout
(`X-Requests-Available-Minute` 8–9):

- **List** `/competitions/WC/matches` → HTTP 200. The `bookings` field is absent from
  every match; **0 of 104** matches carry any bookings.
- **Detail** `/matches/{id}` for **5 FINISHED matches across stages** (group, R32, and
  both R16 knockouts): the `bookings` key is **absent entirely** — not an empty `[]`,
  absent — and so are `goals` and team `statistics`. Detail returns `referees` and `odds`
  only.

| Endpoint / match (stage) | `bookings` | `goals` | team `statistics` |
|---|---|---|---|
| list — all matches | absent | — | — |
| 537327 (Group) | absent | absent | absent |
| 537417 (Round of 32) | absent | absent | absent |
| 537375 (Round of 16) | absent | absent | absent |
| 537376 (Round of 16) | absent | absent | absent |

The uniform, **total absence of the keys** (vs empty arrays) is the signature of a
**tier gate**: football-data serves detailed match events — `bookings` (cards), `goals`,
lineups, team `statistics` — on **paid plans only**. Their docs show a `bookings` example,
but it is not part of this plan's response schema for the WC.

## Current app payload (for reference)
`/api/matches` (Worker → KV) carries no card data either. First-match keys are:
`away, channels, city, group, home, id, matchday, score, stage, status, utcDate, venue`.
A `grep` for `booking|yellow|red_card|card` over the whole served payload returns nothing.

## What would unblock it (only if ever revived)
1. **Pay for football-data** — a paid tier that includes `bookings` for the WC. Verify the
   exact tier at the source *before* subscribing; it's a recurring cost.
2. **Add a second provider** with free match events — e.g. API-Football (api-sports.io),
   whose free tier (~100 req/day) includes fixture events (cards). Would need: a new API
   key, a new client, a **slow backfill into a separate `cards:v1` KV key** (never on the
   request path; respect the daily cap and never block the `snapshot:v1` refresh), and a
   team-ID mapping to our existing data. The handoff's proposed `/api/cards` shape and
   `CardsView` design still apply on top of a real source.

Neither is worth it for a tournament ending ~mid-July 2026 — hence shelved. Nothing is
wasted: the probe method above is exactly step 1 if this is ever revived.

## How to re-verify (don't re-probe blindly — this is a plan gate, not a flaky bug)
```bash
# key is in repo-root .env (gitignored); do NOT print it
KEY=$(grep '^FOOTBALL_DATA_API_KEY=' .env | cut -d= -f2- | tr -d '\r\n')
curl -s -H "X-Auth-Token: $KEY" \
  https://api.football-data.org/v4/matches/537327 | jq 'has("bookings")'
# → false today. If this ever prints true (plan upgraded), the feature becomes buildable.
```
