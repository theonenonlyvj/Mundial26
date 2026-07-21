// The 2026 World Cup is over — the site is a permanent final-results archive.
// In archive mode the app serves the bundled final snapshot (src/data/final/*)
// and makes ZERO network calls, so it outlives the retired Cloudflare Worker.
// Flip ARCHIVE_ACTIVE's `!inTest` to `false` only if the backend ever returns.
const inTest = typeof process !== 'undefined' && process.env
  && (process.env.VITEST || process.env.NODE_ENV === 'test');

// When the final snapshot was captured (2026-07-19, after Spain 1-0 Argentina).
export const ARCHIVED_AT = 1784499358308;

// Off under vitest so existing tests keep exercising the fetch path with stubs.
export const ARCHIVE_ACTIVE = !inTest;
