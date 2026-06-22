import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { begin, end, isWaking, subscribe } from './coldStart.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('coldStart store', () => {
  it('stays calm while requests resolve quickly', () => {
    begin();
    vi.advanceTimersByTime(2999);
    end();
    expect(isWaking()).toBe(false);
  });

  it('flips to waking when a request outlives the threshold', () => {
    begin();
    vi.advanceTimersByTime(3000);
    expect(isWaking()).toBe(true);
    end();
    expect(isWaking()).toBe(false);
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const seen = [];
    const off = subscribe((w) => seen.push(w));
    begin();
    vi.advanceTimersByTime(3000);
    end();
    expect(seen).toEqual([true, false]);
    off();
    begin();
    vi.advanceTimersByTime(3000);
    end();
    expect(seen).toEqual([true, false]);
  });

  it('only settles once the last concurrent request ends', () => {
    begin();
    begin();
    vi.advanceTimersByTime(3000);
    expect(isWaking()).toBe(true);
    end();
    expect(isWaking()).toBe(true);
    end();
    expect(isWaking()).toBe(false);
  });
});
