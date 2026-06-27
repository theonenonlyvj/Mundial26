import seed from './seed.json';

// Bundled snapshot so a FIRST-time visitor (no localStorage cache) still gets a
// real, populated page instantly while the live API wakes — never a blank
// "Loading…". Keyed to match useLiveData keys + each view's fetcher shape.
// `seed.at` is when the snapshot was captured.
const inTest = typeof process !== 'undefined' && process.env
  && (process.env.VITEST || process.env.NODE_ENV === 'test');

export function getSeed(key) {
  if (inTest) return null; // tests assert on stubbed fetch data, not the snapshot
  const data = seed[key];
  return data !== undefined ? { data, at: seed.at } : null;
}
