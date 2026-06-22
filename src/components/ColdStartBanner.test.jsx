// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ColdStartBanner from './ColdStartBanner.jsx';
import { begin, end } from '../api/coldStart.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('ColdStartBanner', () => {
  it('stays hidden when nothing is pending', () => {
    render(<ColdStartBanner />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('appears when the server is cold-starting, then auto-hides on settle', () => {
    render(<ColdStartBanner />);
    act(() => {
      begin();
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByRole('status')).toHaveTextContent(/free server/i);
    act(() => end());
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('does not appear for a fast (warm) request', () => {
    render(<ColdStartBanner />);
    act(() => {
      begin();
      vi.advanceTimersByTime(500);
      end();
    });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
