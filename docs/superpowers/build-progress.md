# Mundial26 — Build Progress (subagent-driven execution)

## Foundation — ✅ COMPLETE (merged to `main`, 41/41 tests)
Backend data layer (cache + snapshot fallback, football-data.org client, normalize, advancement/tiebreaker logic, `/api` routes) + Panini design system + app shell + deploy config. Whole-branch review caught & fixed a Critical advancement bug (false "Through" on tiebreaker-3rd).

## Experience — ✅ all phases implemented + reviewed (branch `build/experience`, pending final review + merge)
Base `8e09ba4`. Each phase TDD + per-phase review + fix loop. Full suite **77 tests, pristine (no act warnings)**.
- **Phase 4** glossary + Modal + How-It-Works onboarding — Approved.
- **Phase 5** full Today dashboard + what-to-watch hero — Approved. Fix: pinned hero+strip count, FINISHED/cap/PAUSED coverage, emphasized the "why" reason.
- **Phase 6** Standings & Bracket — Approved. Fix (§2.5): show per-row advancement notes (not just leader) + GF column. TiebreakerExplainer verified factually correct vs backend.
- **Phase 7** Timeline by date — Approved. Fix: pinned `en-US` date locale (portability bug), single-today-marker test.
- **Phase 8** host-city Map (SVG pins) — Approved. Fix (a11y): pins activate on Space+Enter, `role=group` on svg, keyboard test. DRY: cities via `/api/reference` (single source).
- **Polish** — `aria-modal` on Modal; real glossary tooltips (`Term`) in onboarding so "hover any underlined term" is true.

## Next
- Experience final whole-branch review (opus) → merge `build/experience` → `main`.
- (Optional) launch the app + screenshot to show it running; set up Render deploy.

## Toolchain / permissions notes
- node/npm via `/opt/homebrew/opt/node/bin/{npm,npx}`. Permissions: broad allow-rules + `defaultMode: auto` (activated via /hooks).
