# Mundial26 maintainer start here

Mundial26 is a permanent static final-results archive. It has no live backend,
scheduled refresh, API secret, or operational database.

Read in this order:

1. `README.md` — public project status and local commands.
2. `docs/HANDOFF.md` — concise archive architecture and source map.
3. `docs/BLUEPRINT.md` — reusable lessons for future sporting-event builds.
4. `docs/sports-logic-correctness-audit.md` — the provisional-result failure
   class and its tested safeguards.

The `worker/` tree is historical evidence from the live tournament. Its
resources were deleted. Never deploy it or use its configuration to recreate
infrastructure. A future live sporting-event product should begin with a new
design and fresh infrastructure, reusing lessons and tests rather than this
retired deployment.

Verification gates:

```bash
npm test
npm run build
```
