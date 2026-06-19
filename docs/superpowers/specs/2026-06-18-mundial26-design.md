# Mundial26 — Design Spec

- **Date:** 2026-06-18
- **Status:** Draft — awaiting user review
- **Project:** Mundial26 (`/Users/vijayram/Cursor/mundial26`)

## 1. Vision

A retro **Panini sticker-album** web app that tracks the **FIFA World Cup 2026** (USA · Canada · Mexico). It visualizes what's been played and what's coming up — organized by **date** and by **host city** — in an exciting, collectible-feeling experience. A core goal: a person who has **never watched soccer** can fully follow along, because the group-stage rules, advancement, and tiebreakers are explained in plain English right where they're needed.

This is **not** a live-score ticker. Data is fetched and cached periodically; the experience is about beautiful visualization and understanding, not second-by-second scores.

## 2. Goals & Non-Goals

### Goals
- Exciting, distinctive **Panini / retro sticker-album** look and feel.
- Four views: **Today**, **Timeline (by date)**, **Map (by host city)**, **Standings & Bracket**.
- **Newcomer-friendly:** explain how the 48-team group stage works, who's advancing and why, and how tiebreakers resolve.
- Real data from a **free** API (football-data.org), fetched server-side with an API key kept private.
- Deployable as a **single Render web service**.

### Non-Goals (YAGNI)
- No real-time/live tick (no websockets, no per-second polling).
- No user accounts, logins, favorites, or personalization (v1).
- No predictions, betting, or analytics.
- No native/mobile app — responsive web only.
- No multi-tournament support — World Cup 2026 only.

## 3. Users

1. **The casual/newcomer viewer** — doesn't know soccer; wants to understand what's happening and feel the excitement. Primary audience for the explainer layer.
2. **The fan** — wants a fast, attractive way to see results, fixtures, standings, and the bracket.

## 4. Data

### Source
- **football-data.org v4 API**, competition code **`WC`**.
  - `/competitions/WC/matches` — fixtures, results, status, UTC date/time, stage/group, venue.
  - `/competitions/WC/standings` — group tables (played, W/D/L, GF/GA/GD, points).
  - `/competitions/WC/scorers` — top scorers (nice-to-have extra).
- API key supplied via the `X-Auth-Token` header, read from an environment variable on the server. **Never exposed to the browser.**

### Caching & rate limits
- Free tier is rate-limited (~10 requests/min). The backend caches each upstream response **in memory with a TTL** (~2–5 min; tunable per endpoint).
- On an upstream error or rate-limit, the backend serves the **last good cached copy** and the frontend shows an "updated X min ago" stamp. The app never shows a blank screen on an API hiccup.

### Bundled static reference data
Shipped with the app to de-risk sparse API fields and to power views the API doesn't fully cover:
- **Host cities & stadiums:** the 16 host cities (USA/Canada/Mexico) with stadium name, city, country, and lat/long — powers the Map and city labels.
- **Group definitions:** groups A–L and their teams (reconciled against the API at runtime).
- **Team metadata helpers:** flag rendering by country, fallbacks for crests.

### ⚠️ 2026 format (drives the explainer)
World Cup 2026 uses the **new 48-team format**:
- **12 groups (A–L) of 4 teams.** Round-robin within each group (everyone plays everyone once).
- Win = **3 pts**, draw = **1**, loss = **0**.
- **Top 2 of each group + the 8 best 3rd-place teams** advance to a **Round of 32**, then Round of 16 → Quarterfinals → Semifinals → Final.
- Tiebreakers (to be verified against the data and FIFA rules during build): points → goal difference → goals scored → head-to-head, etc.

This format differs from the old 32-team/8-group tournament, which is exactly why the newcomer explainer matters.

## 5. Architecture

A **single Render web service**:

```
Browser ──► Express server (Render) ──► football-data.org
            │  - serves built React SPA
            │  - /api/* proxy endpoints
            │  - in-memory cache (TTL) + last-good fallback
            │  - merges API data with bundled static reference data
            └─ API key from env (X-Auth-Token), never sent to browser
```

- **Backend:** Node + Express.
  - Serves the built frontend (static files).
  - Exposes `/api/matches`, `/api/standings`, `/api/scorers` (shapes/normalizes upstream data for the frontend).
  - Owns the cache, the rate-limit handling, and the merge with static reference data.
- **Frontend:** React + Vite single-page app with four views (client-side routing/tabs).
- **Deploy:** one Render service. Build step builds the frontend; start step runs Express. API key set as a Render environment variable.

### Decisions made during brainstorming (open to change)
- **Stack: React + Vite + Express** — user knows React; clean fit for a multi-view SPA + single Render service.
- **Map: a stylized hand-drawn SVG** of US/Canada/Mexico with city pins — chosen over a real map library (e.g. Leaflet) because it suits the Panini aesthetic and is simpler and more reliable.

## 6. Views

### 6.1 Today (landing)
- Today's matches as glossy **sticker cards**: team flags/crests, kickoff time (or final score), group, host city.
- A **"yesterday's results"** strip and a **"coming up next"** strip.
- Friendly **empty state** on rest days (e.g., "No matches today — next up: …").

### 6.2 Timeline (by date)
- Scroll the whole tournament, **Jun 11 → Jul 19, 2026**, grouped by matchday/date.
- Jump to any date; **"Today"** is anchored/highlighted on load.
- Each day shows its matches as compact stickers.

### 6.3 Map (by host city)
- A **stylized SVG map** of the three host nations with **16 city pins**.
- Click a city → its stadium details + matches **played and upcoming** there.

### 6.4 Standings & Bracket
- The **12 group tables** in sticker styling.
- **Advancement cues** on each row: ✅ *Through* / ⚠️ *Still alive* / ❌ *Eliminated*, plus a plain-English one-liner ("needs a win or draw to advance").
- On-demand **tiebreaker explainer**.
- A **Round-of-32 → Final bracket** that fills in as results come; undecided slots show **"TBD"** placeholders.

## 7. Newcomer Explainer Layer (cross-cutting)

- **"How it works"** intro styled like an album's opening page (modal or page): the 48-team format, points, and advancement, in plain English.
- **Inline badges** on standings (the advancement cues above).
- **Tiebreaker popover** explaining how ranking is resolved.
- **Bracket linkage** visualizing how groups feed the knockout rounds.

The advancement/tiebreaker computations are the most error-prone, newcomer-facing logic and get dedicated tests (see §9).

## 8. Panini Design System

A small reusable component kit used across all four views:
- Components: `MatchSticker`, `TeamSticker`, `GroupTable`, advancement badges, `StickerCard` shell.
- Visual language: rounded sticker corners, subtle paper texture, foil/shine accents, bold condensed type, vintage color palette, slightly glossy finish.
- Consistency across views is a first-class requirement (the "foundation first" build order serves this).

## 9. Error Handling

- **API failure / rate-limit:** serve last-good cache; show "updated X min ago"; never blank.
- **Missing/undecided data:** graceful **"TBD"** placeholders (e.g., knockout slots not yet determined, sparse venue fields backfilled from static data).
- **Cold start with no cache + upstream down:** show a friendly, on-theme error state rather than a broken page.

## 10. Testing

- **Backend (unit, upstream mocked):**
  - Cache/adapter behavior (TTL, last-good fallback on error).
  - **Advancement logic** (top 2 + best-third computation) and **tiebreaker ordering** — the highest-value tests.
  - Normalization of upstream shapes + merge with static reference data.
- **Frontend (component):**
  - `MatchSticker` states: upcoming / in-progress / final.
  - Standings **advancement badges** render the right state from given data.

## 11. Open Questions / Risks

1. **Free-tier coverage:** confirm the free football-data.org plan exposes WC 2026 `matches`/`standings` with the fields we need (especially venue/city and best-third data). Mitigation: bundled static reference data + graceful fallbacks.
2. **Exact tiebreaker rules** for the 48-team format and best-third ranking — verify against FIFA rules and the API during build.
3. **Toolchain:** local `npm` is 6.13.4 while Node is v26 — resolve (use the npm bundled with Node, or nvm/corepack) before scaffolding.
4. **Render free tier** may cold-start/sleep; acceptable for v1 (no live data), worth noting.

## 12. Build Order

**Foundation first, then all views** (user's choice): build the backend + data layer + Panini design system once, then layer in all four views together for a cohesive look. (Detailed sequencing comes in the implementation plan.)
