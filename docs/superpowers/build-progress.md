# Mundial26 — Build Progress (subagent-driven execution)

## Foundation — ✅ COMPLETE (branch `build/foundation`, merged to `main`)

Base `e0513c5`. All four phases implemented TDD, each reviewed; then a whole-branch review on the most capable model, which caught a Critical bug (now fixed). Full suite **41/41**, pristine.

- **Phase 0** scaffold — Approved. Plan fix: vitest.config needs `plugins:[react()]`.
- **Phase 1** backend data layer (cache + last-good fallback, football-data.org client, normalize, advancement/tiebreaker logic, data service w/ snapshot fallback, `/api` routes) — Approved. Fixes: dropped unused `now` param; added dataService live-path tests.
- **Phase 2** Panini design system + app shell + minimal Today view — Approved (after fixing an `act()` warning; tests pristine).
- **Phase 3** Render deploy config (`render.yaml`, `engines`, deploy docs) — prod smoke test passed (Express serves SPA + `/api`).
- **Final whole-branch review** (opus) — verdict "merge with fixes":
  - **CRITICAL fixed** (`433f45a`): `advancementStatus` falsely marked tiebreaker-3rd teams "Through". Now rank-based when the group is complete (+ conservative points clinch mid-group). Proven by a completed-3-way-tie test (3rd-on-GD → `alive`, not `through`).
  - Important fixed: `bestThirds` small-field test; guarded the live standings transform with snapshot fallback.
  - Deferred Minors (Experience plan): MatchSticker `0–0` null-score display; `Term` is title-only (real popover comes with the views); shallow scorers test.

## Toolchain / permissions notes
- Run node/npm via `/opt/homebrew/opt/node/bin/{npm,npx}` (old npm 6 shim shadows PATH).
- Permissions: broad allow-rules in `~/.claude/settings.json` + `defaultMode: auto` in project `.claude/settings.json`. Keep ledger in `docs/` (writes into `.git/` are gated specially).

## Next
- **Experience plan** (phases 4–8: glossary + How-It-Works onboarding, full Today dashboard w/ what-to-watch, Standings & Bracket, Timeline, host-city Map). New branch `build/experience` off updated `main`.
