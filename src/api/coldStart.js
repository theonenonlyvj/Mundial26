// Tracks in-flight API requests so the UI can tell when the free-tier server
// is cold-starting. If any request stays pending past THRESHOLD_MS, we flip to
// "waking" and notify subscribers; once all requests settle we flip back.
const THRESHOLD_MS = 3000;

let pending = 0;
let timer = null;
let waking = false;
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn(waking);
}

function setWaking(next) {
  if (waking === next) return;
  waking = next;
  notify();
}

// Bracket a request. Call begin() before the fetch and end() in a finally.
export function begin() {
  pending += 1;
  if (pending === 1 && timer === null) {
    timer = setTimeout(() => {
      timer = null;
      if (pending > 0) setWaking(true);
    }, THRESHOLD_MS);
  }
}

export function end() {
  pending = Math.max(0, pending - 1);
  if (pending === 0) {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    setWaking(false);
  }
}

export function isWaking() {
  return waking;
}

// Subscribe to waking-state changes. Returns an unsubscribe fn.
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
