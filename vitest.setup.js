import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

// vitest's jsdom env doesn't provide localStorage — give tests a minimal in-memory
// one so the data cache behaves like a real browser.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
}

// Keep the cache from leaking between tests.
beforeEach(() => {
  try { localStorage.clear(); } catch { /* ignore */ }
});
