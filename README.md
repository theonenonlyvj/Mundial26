# Mundial26 ⚽️🏆

A retro **sticker-album** tracker for the **FIFA World Cup 2026** (USA · Canada · Mexico).

Mundial26 visualizes what's been played and what's coming up — by **date** and by **host city** — in an exciting, Panini-style album experience. It's built to be just as readable for someone who has never watched soccer as for a die-hard fan: the group-stage rules, advancement, and tiebreakers are all explained in plain English, right where you need them.

## Views
- **Today** — what's on today, recent results, and what's coming up next.
- **Timeline** — scroll the whole tournament by date (Jun 11 → Jul 19, 2026).
- **Map** — a stylized map of the 16 host cities; click a city to see its matches.
- **Standings & Bracket** — group tables with plain-English advancement cues, plus the knockout bracket.

## Status
🚧 In design. See the spec: [`docs/superpowers/specs/2026-06-18-mundial26-design.md`](docs/superpowers/specs/2026-06-18-mundial26-design.md).

## Data
Fixtures, results, and standings come from the [football-data.org](https://www.football-data.org) free API (no live tick — refreshed periodically). Host-city and group reference data is bundled.

## Run locally
1. `cp .env.example .env` and (optionally) add `FOOTBALL_DATA_API_KEY`. Without a key the app serves bundled snapshot data.
2. `npm install`
3. `npm run dev` — Vite on its dev port, Express API on :3000 (proxied).

## Deploy (Render)
- Push to GitHub, create a Render **Blueprint** from `render.yaml`.
- Set `FOOTBALL_DATA_API_KEY` in the Render dashboard (Environment).
- Render runs `npm install && npm run build`, then `npm start` (Express serves `dist/` + `/api`).
