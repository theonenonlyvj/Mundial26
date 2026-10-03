# Mundial26 ⚽️🏆

A retro **sticker-album** tracker for the **FIFA World Cup 2026** (USA · Canada · Mexico).

Mundial26 visualizes what's been played and what's coming up — by **date** and by **host city** — in an exciting, Panini-style album experience. It's built to be just as readable for someone who has never watched soccer as for a die-hard fan: the group-stage rules, advancement, and tiebreakers are all explained in plain English, right where you need them.

## Views
- **Today** — what's on today, recent results, and what's coming up next.
- **Timeline** — scroll the whole tournament by date (Jun 11 → Jul 19, 2026).
- **Map** — a stylized map of the 16 host cities; click a city to see its matches.
- **Standings & Bracket** — group tables with plain-English advancement cues, plus the knockout bracket.

## Status

**Archived:** the tournament is complete. The site is a self-contained static
final-results archive with bundled data and no runtime API, cron, database, or
secret. The retired Cloudflare backend was deleted and must not be redeployed.

## Data

Final fixtures, results, standings, scorers, and reference data are bundled
under `src/data/final/`. During the tournament the project normalized data from
[football-data.org](https://www.football-data.org); the preserved live-era
worker and operational logs are historical material only.

## Run locally

```bash
npm install
npm run dev
```

The archive reads its bundled snapshot and makes no data-network requests.

## Verify

```bash
npm test
npm run build
```

See `docs/BLUEPRINT.md` for reusable live-sports engineering lessons and
`docs/HANDOFF.md` for the archived architecture. Do not deploy `worker/`.
