// Tiny localStorage cache so the always-on static page can show the LAST scores
// instantly (with a timestamp) while fresh data loads behind the cold-start
// banner — instead of a blank "Loading…" when the free API is asleep.
const PREFIX = 'mundial26:cache:';

function ls() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // private mode / disabled storage
  }
}

export function readCache(key) {
  const s = ls();
  if (!s) return null;
  try {
    const raw = s.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null; // { data, at }
  } catch {
    return null;
  }
}

export function writeCache(key, data) {
  const s = ls();
  if (!s) return;
  try {
    s.setItem(PREFIX + key, JSON.stringify({ data, at: Date.now() }));
  } catch {
    /* quota / serialization — non-fatal */
  }
}
