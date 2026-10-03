# Repository guidance

Treat this repository as public and archived.

- Start with `docs/handoff/START_HERE.md`, then read `README.md` and
  `docs/HANDOFF.md`.
- Keep personal information, secrets, machine-specific paths, private
  infrastructure, and material from unrelated workspaces out of the repo.
- Do not add remotes, push, publish, or deploy without explicit authorization.
- The production data backend was deleted after the tournament. Everything
  under `worker/` is retained historical source: never deploy it or recreate
  its deleted Worker, KV, D1, secret, or cron resources.
- `src/archive.js` and the archive short-circuit in `src/api/client.js` keep
  the site self-contained. Preserve that behavior unless a separately designed
  future event explicitly reactivates live data.
- Run `npm test` and `npm run build` after root changes. Worker tests may be
  run locally with `cd worker && npm test`; do not run Wrangler deploy commands.
