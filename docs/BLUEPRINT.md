# Blueprint: building a live-sports tracker on a free stack

Hard-won lessons from Mundial26 (FIFA World Cup 2026 tracker). Written to be reused —
for rebuilding this, or building the next one (e.g. an F1 race tracker). The
domain specifics differ; the failure modes don't. **Keep this updated as we learn more.**

---

## 0. The one reframe that matters most

**The data is identical for every visitor.** A scoreboard, a bracket, a race
standings page — everyone sees the same bytes. So there is *no reason* to compute
it per-request against a live backend.

→ **Precompute once, serve a static-ish snapshot from the edge.** A scheduled job
fetches + normalizes the upstream data and writes a snapshot to edge storage; the
page reads that snapshot. Never a cold start, never a per-user fetch, scales to any
crowd, free.

Everything below follows from taking this seriously.

---

## 1. Architecture that worked (copy this shape)

```
Upstream API (flaky free tier)
        │  (server-side key; browsers usually can't call it — CORS locked)
        ▼
Cloudflare Worker
   ├─ scheduled (cron, ~1 min): GATE → fetch → normalize → write snapshot to KV
   │                            └─ also append every change to D1 (the log)
   └─ fetch (per request): read snapshot from KV → serve JSON (CORS + cache)
        ▼
Static SPA on a CDN (Render static / Cloudflare Pages)
   └─ reads JSON from the Worker; localizes time per-viewer in the browser
```

- **Cloudflare Worker + KV** is a free, always-on edge data layer. Worker cron is
  reliable (~1 min granularity). KV is the snapshot store. D1 (SQLite) is the log.
- **The SPA stays a dumb static site.** Its only per-user logic is timezone/locale
  formatting and which tab is open — both client-side. The *data* is universal.
- **Never put a sleeping service in the request path.** A free backend that sleeps
  → cold starts → blank/stale pages. We wasted days building band-aids (bundled
  seed snapshot, localStorage cache, stale-guard, "server waking up" banner,
  keep-warm cron) to hide a sleeping API. Deleting the sleeping API deleted all of it.

**Do NOT use GitHub Actions as the always-on data backend.** Its cron is flaky
(5-min floor, frequently delayed/skipped), and using it as a live backend is a ToS
gray area ("activity unrelated to building/deploying the repo"). Cloudflare Workers
cron is purpose-built and free. (GitHub Actions cron is fine for *occasional*
maintenance, not a per-minute live feed.)

---

## 2. The upstream free tier is the hardest part. Design for it being WRONG.

This is where all the real pain was. Free sports APIs are not just *slow* — they are
**inconsistent, internally contradictory, and they regress.**

- **No live clock / coarse updates.** football-data free tier has no live minute, lags
  ~1–5 min, and updates roughly every 1–2 min during live play (measured). Don't
  promise real-time.
- **Volatile around state transitions.** Penalty shootouts, extra time, VAR, and the
  full-time transition are where the data goes haywire. We saw a single match report,
  over ~10 hours: a correct winner → a *different* winner → "no winner / tied
  penalties" garbage → finally settle correctly. The `winner` field was `null` while
  the score implied a winner; `fullTime` was an *aggregate* (regulation + shootout),
  not a real score; the `penalties` field was tied (impossible) for a decided tie.
- **It can REGRESS, and it FLAPS.** A correct result can later become garbage. A
  "decided" result flips back to "undecided" — and worse, we saw a FINISHED match
  (Ivory Coast–Norway) **oscillate FINISHED 1-2 ↔ TIMED null-null every single minute
  for hours.** So the site would show "Norway won" then "kickoff Tuesday" then "Norway
  won"… The fix: treat a *settled* result (finished + scores + a winner) as sticky —
  never let it regress to a non-settled state — *unless* the new read carries a real,
  present, **different** score (a legitimate VAR/called-back-goal change). The log is
  what caught the flap; we'd never have seen it otherwise.
- **It fills derived/intermediate records inconsistently.** Some next-round fixtures
  got their teams populated, adjacent ones stayed TBD — arbitrarily. Don't depend on
  the feed to populate downstream slots. **Compute forward yourself** (winner of a
  decided match → the next round's competitors) and let the feed's own value win only
  where it actually provides one.

**Rules that fell out of this (each one cost us a live, embarrassing bug):**

1. **Never trust a single reading. Keep refetching until it SETTLES.** Don't stop at
   the first "FINISHED." We froze a transient wrong result because our refetch window
   closed before the upstream stabilized. Fix: keep chasing a finished-but-undecided
   result for a long bound (we used 24h) until the upstream gives a decisive answer.
2. **Never downgrade a decided result to undecided.** Once you've recorded a real
   winner, a later "no winner" wobble must not erase it. But tighten the guard to
   *only* fire when the score is unchanged — a real change (a called-back goal → a
   different score, or a genuinely different winner) must always be taken. (Think VAR:
   a goal gets disallowed; that's a real score change and must win.)
3. **Derive robustly; cross-check fields.** Don't read one field. football-data leaves
   `winner: null` for some shootouts → derive the winner from the (consistent)
   aggregate `fullTime`. Compute the penalty score as `fullTime − (regularTime +
   extraTime)` rather than trusting the wobbly `penalties` field.
4. **Prefer the authoritative answer when it arrives.** Our computed value is a
   *fallback* while the feed is still TBD; the moment the feed fills in the real
   value, it wins.

---

## 3. Log everything from day one (we added it late and regretted it)

Build a **durable, append-only log of every observed state change before you build
anything else.** When a user says "it showed the wrong score at 6pm," or you need to
know "does the feed report EXTRA_TIME live or only at full time," the log is the only
way to answer. Cloudflare **D1** (SQLite, free) bound to the Worker is perfect: the
cron appends a row per changed match each tick (timestamp, status, duration, score,
winner, penalties). Expose it as a JSON endpoint. It's also your audit trail and your
flakiness diagnostic. **This should be task #1, not task #20.**

---

## 4. Verify the RENDER, not just the data (our most-repeated mistake)

Multiple times we fixed the data, confirmed the *data* was right, declared victory —
and the **component didn't render it.** Example: a `kind:'team'` display value handed
to a component that only knew `kind:'slot'` and `kind:'either'` fell through to "TBD."
The data was perfect; the pixels said "TBD."

→ **Always verify the actual rendered output.** Write a render test (e.g.
`@testing-library/react`) that asserts the user-visible text, ideally against *live*
data, for anything user-facing. "The JSON is correct" is not "it's fixed."

For layout bugs, verify the actual viewport shape too. A 2026-07-05 mobile Safari
report showed the footer sitting above a large blank beige area because the app shell
was ordinary block layout and short pages ended before a tall viewport did. The durable
pattern is: root app shell `min-height: 100vh` plus `100dvh`, `display: flex`,
`flex-direction: column`, and a growing main area (`flex: 1; width: 100%`). Add a CSS
regression test for that contract and use headless Chrome/mobile metrics to prove the
footer bottom equals the viewport bottom (`spaceAfterFooter: 0`).

---

## 5. Topology: anchor to the fixed schedule, not to identities

For a knockout bracket (or any structured schedule), don't bind live results to slots
by **who's in them** — teams are TBD early, so identity-anchoring fails and you can't
place anything. Bind by the **fixed published schedule** (round + venue + date): every
fixture has a predetermined slot regardless of the participants. Then overlay
participants/results as they're known.

- Resolve forward (winner of a decided match → the next round's slot), but let the
  feed's own answer win once it fills in.
- Show computed labels for unknowns ("Grp K · 1st", "Winner R32", "A or B") — never a
  bare "TBD." A predetermined fixture still has a date, venue, and TV channel; show them.

*(F1 analog: anchor sessions to the fixed calendar — round N, circuit, date — not to
entry lists or who's currently classified. Qualifying → grid → race is your "bracket.")*

---

## 6. Smaller traps that bit us

- **Filter-then-slice, never slice-then-filter.** Capping a list to N *before*
  filtering silently drops valid items that sit past position N. Filter the whole list
  for "has something to show," *then* take N.
- **Static hosts are immutable per deploy.** Render static / Cloudflare Pages can't
  "patch one file" — changing served content means a new deploy. Mutable data belongs
  in KV/D1, not in the bundle. (We bundled a seed snapshot; it froze and aged.)
- **A field you display must exist in your normalizer's output.** We added a
  `livePhase` that read `score.duration`, but the normalizer dropped `duration` — so it
  silently never fired. If you render `x.foo`, make sure normalize emits `foo`.
- **CORS: the browser usually can't call the sports API directly** (football-data
  returns `Access-Control-Allow-Origin: http://localhost`). A server-side proxy
  (the Worker) is mandatory, and it keeps the API key off the client.
- **Cache layers lie.** The upstream's single-resource endpoint was CDN-cached and
  lagged; the list endpoint was fresher. A `?cb=<varying>` param fetches fresher. Know
  which endpoint you're hitting and whether it's cached.

---

## 7. Process lessons

- **Get ground truth before fixing.** When something's wrong, pull the *actual*
  upstream payload and the *actual* served payload and diff them. Don't theorize from
  the code. (Systematic debugging beat guessing every time here.)
- **Reproduce against live data.** A unit test with clean fixtures won't show you the
  upstream's garbage. Pull a real snapshot and run your logic over it.
- **Phased, reversible rollout.** New data layer behind a single env var
  (`VITE_API_URL`) so flipping back is a 1-line rollback with no code change. Keep the
  old service alive (suspended) until the new one is proven through a full live cycle.
- **The cheap free-tier limits, written down:** football-data 10 req/min (no daily cap);
  Cloudflare Workers free 100k req/day — **ACCOUNT-WIDE, shared across every Worker on
  the account, not per-Worker** (see §9, this took the site down); KV 1k writes/day (so
  write-on-change matters); D1 generous. Cron min granularity 1 min (CF) / 5 min (GH,
  unreliable).

---

## 8. If building the F1 tracker

- **Data source is the make-or-break decision.** Historical F1 data is easy (Ergast /
  its successor jolpica-f1, free). *Live timing* is the hard part — the official F1
  live timing feed is not openly free; community SignalR scrapers exist but are
  fragile. Decide up front: live-during-session vs. results-after. The same
  "free tier is flaky → log it, settle it, verify the render" rules apply, harder.
- **Model: season → rounds → sessions (FP1/2/3, Sprint, Quali, Race).** Anchor to the
  fixed calendar. Each session has a predetermined date/circuit/time — your "schedule
  anchoring." Results (grid, classification, fastest lap, DNFs, penalties) overlay.
- **Same architecture:** Worker cron → normalize → KV snapshot + D1 log → static SPA.
- **Penalties/stewards' decisions are the F1 equivalent of VAR/shootouts** — post-session
  classification changes for hours (time penalties applied late). The "don't trust a
  single reading, keep chasing until settled, never downgrade a decided result, but
  take a real change" rules are *exactly* what you'll need. Build the log first.

---

## 9. The outage that had nothing to do with our code (2026-07-14)

Four days before the final, the site froze: stale scores, knockout slots stuck on
"A or B". Nothing in our stack had changed. Diagnosis took two curls:

- Every Worker endpoint returned **HTTP 429, body `error code: 1027`** — the
  signature of **Cloudflare's free-plan daily request cap (100k/UTC-day) being
  exhausted**. When it trips, Cloudflare disables the Worker — the API *and* the
  cron — until 00:00 UTC. No override on the free plan.
- Root cause wasn't this app at all: **the cap is ACCOUNT-WIDE.** A different
  (buggy, request-spamming) app on the same account drained the shared bucket and
  this site went down as collateral.

**Lessons:**
1. **Diagnose from the edge inward.** "The site is stale" looked exactly like our
   old feed-lag bugs. One `curl -D -` of the API distinguished "platform said no"
   (429/1027) from every data bug we'd previously fought. Always get the raw HTTP
   status before theorizing about your own logic.
2. **Every Worker on the account shares fate on the free plan.** One runaway app
   takes down all of them. Either keep unrelated projects on separate accounts, or
   accept the blast radius, or pay.
3. **The paid tier is the honest fix during a high-stakes window:** $5/mo →
   10M req/mo shared, restore is INSTANT (429s stop, cron resumes, site self-heals
   within ~2 min — verified live). Overage is $0.30/million — the scary-sounding
   "usage billing" is dollars, not disasters, IF the runaway app is fixed. There is
   NO hard spend cap, so set a Usage-Based Billing notification, and downgrade
   after the event window if you don't need it.
4. **The SPA's cache-first design was the graceful-degradation hero:** visitors saw
   last-known data, not a blank page, through the whole outage. Design for "my
   backend is gone" from day one — it eventually will be (see §10).

---

## 10. End-of-life: archiving a live-data site into a permanent static one

Events END. Plan for the site to outlive its backend. The full procedure, executed
2026-07-21 (works for any Worker/KV-backed tracker; the site stayed up throughout):

1. **Capture the final payloads while the backend is still up.** Curl every API
   slice the SPA consumes and commit them to the repo (`src/data/final/*.json`).
   Verify completeness first (every match FINISHED, every knockout has a decisive
   winner) — this data is about to become the site, forever.
2. **Flip to archive mode at the LOWEST data chokepoint.** One flag
   (`src/archive.js`), one short-circuit in the API client's single `getJson`-style
   entry point: archive on → return the bundled final payloads. Every consumer
   (hooks, one-off fetchers, inline view fetchers) goes static at once — no
   per-view surgery, and stray fetch paths can't leak network calls.
3. **Bundled-final must BEAT the visitor's local cache.** A cache-first SPA's
   returning visitors have mid-tournament localStorage; if cache wins, they see
   stale data forever. Flip the preference (seed ?? cache) in archive mode and let
   the one-shot "fetch" (now local) overwrite their cache.
4. **Kill the polling; keep the code path.** No intervals in archive mode — the
   data can never change. Guard, don't delete, so un-archiving is a one-flag flip.
5. **Say it's an archive.** A banner naming the champion + "permanent
   final-results archive", the freshness stamp switched to "Final results —
   tournament complete", and title/OG/meta updated (link previews are how it gets
   shared). Honesty beats a site that looks mysteriously frozen.
6. **Prove self-containment BEFORE teardown, behaviorally.** Tests + build, then
   headless-render the built site and the DEPLOYED site: archive banner present,
   real data rendered, zero errors, zero backend references in the bundle. Only
   then is deletion safe. (Deleting first and hoping is how archives die.)
7. **Export the operational logs into the repo** (D1 game-state log, KV status
   log) before deleting the databases. That history is irreplaceable — and it's
   the raw material for the NEXT build (see below).
8. **Tear down in dependency order, verifying each:** Worker (kills cron +
   secrets) → KV namespace → D1. Expect a few minutes of edge-cache propagation
   before the Worker URL 404s (error 1042 = actually gone). Re-verify the live
   site AFTER teardown. Clean up dead env vars on the host (e.g. the baked
   `VITE_API_URL`).
9. **Steady state = $0 and zero moving parts:** a static CDN site + a git repo.
   Nothing to renew, nothing to break, still shareable.

**Raw material preserved for the next tracker (F1 or otherwise):**
- `src/data/final/{matches,standings,scorers,reference}.json` — a complete,
  normalized 104-match World Cup in our own schema. Real fixture data for tests.
- `docs/final-data/match_log.json` — **528 rows of OBSERVED free-tier feed
  behavior over a full tournament**: every status flap, score regression,
  provisional-winner wobble, and an extra-time final. This is a ready-made
  torture-test corpus — replay it against the next normalizer before going live.
- `docs/final-data/statuslog.json` — every status-vocabulary transition the feed
  actually emitted (incl. the undocumented `LIVE`), ending in `{FINISHED: 104}`.
