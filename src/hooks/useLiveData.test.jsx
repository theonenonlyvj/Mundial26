// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor, renderHook } from '@testing-library/react';
import { useLiveData } from './useLiveData.js';
import { writeCache } from '../api/dataCache.js';

afterEach(() => vi.restoreAllMocks());

function Probe({ fetcher }) {
  const { data, dataAsOf, error } = useLiveData('probe', fetcher);
  return (
    <div>
      <span data-testid="val">{data?.v ?? 'none'}</span>
      <span data-testid="asof">{dataAsOf ? 'yes' : 'no'}</span>
      <span data-testid="err">{error ?? ''}</span>
    </div>
  );
}

describe('useLiveData', () => {
  it('shows cached data immediately, then refreshes', async () => {
    writeCache('probe', { v: 'cached' });
    let resolve;
    const pending = new Promise((r) => { resolve = r; });
    render(<Probe fetcher={() => pending} />);
    // cached value paints right away (no await)
    expect(screen.getByTestId('val').textContent).toBe('cached');
    await act(async () => { resolve({ v: 'fresh' }); await pending; });
    await waitFor(() => expect(screen.getByTestId('val').textContent).toBe('fresh'));
    expect(screen.getByTestId('asof').textContent).toBe('yes');
  });

  it('keeps showing cached data when the fetch fails', async () => {
    writeCache('probe', { v: 'cached' });
    render(<Probe fetcher={() => Promise.reject(new Error('asleep'))} />);
    await waitFor(() => expect(screen.getByTestId('err').textContent).toBe('asleep'));
    expect(screen.getByTestId('val').textContent).toBe('cached');
  });

  it('re-fetches on the refresh interval when refreshMs is set', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn().mockResolvedValue({ stale: false, matches: [] });
      renderHook(() => useLiveData('matches', fetcher, { refreshMs: 60_000 }));
      await vi.advanceTimersByTimeAsync(0);
      expect(fetcher).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers(); // restore even if an assertion throws, so timers don't leak into other tests
    }
  });
});
