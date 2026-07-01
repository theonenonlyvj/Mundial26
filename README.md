# Mundial26 ⚽️🏆

A retro **sticker-album** tracker for the **FIFA World Cup 2026** (USA · Canada · Mexico).

Mundial26 visualizes what's been played and what's coming up — by **date** and by **host city** — in an exciting, Panini-style album experience. It's built to be just as readable for someone who has never watched soccer as for a die-hard fan: the group-stage rules, advancement, and tiebreakers are all explained in plain English, right where you need them.

## Views
- **Today** — what's on today, recent results, and what's coming up next.
- **Timeline** — scroll the whole tournament by date (Jun 11 → Jul 19, 2026).
- **Map** — a stylized map of the 16 host cities; click a city to see its matches.
- **Standings & Bracket** — group tables with plain-English advancement cues, plus the knockout bracket.

## Status
✅ **Live: https://mundial26-app.onrender.com** — a static SPA on Render, backed by a Cloudflare Worker (edge KV snapshot, refreshed by a 1-minute cron).

## Data
Fixtures, results, and standings come from the [football-data.org](https://www.football-data.org) free API (no live tick — refreshed periodically). Host-city and group reference data is bundled.

## Run locally
1. `npm install`
2. `npm run dev` — Vite dev server. The SPA fetches live data straight from the Cloudflare Worker (proxied at `/api`). No local API server and no API key needed locally — the `FOOTBALL_DATA_API_KEY` lives on the Worker.

## Deploy
- **Frontend** (Render static site `mundial26-app`): push to `main` → Render auto-builds from `render.yaml` (`npm run build`, publishes `dist/`). Set `VITE_API_URL` to the Worker URL in the dashboard.
- **Backend** (Cloudflare Worker `mundial26-data`): `cd worker && npx wrangler deploy`. It holds the `FOOTBALL_DATA_API_KEY` secret and a 1-minute cron refreshes the KV snapshot the SPA reads. (No Render backend — the old Express API was retired.)
