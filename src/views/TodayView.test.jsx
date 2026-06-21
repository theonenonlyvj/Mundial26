// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TodayView from './TodayView.jsx';

afterEach(() => vi.restoreAllMocks());

const match = (id, utcDate, status, home, away) => ({
  id, utcDate, status, stage: 'GROUP_STAGE', score: { home: 1, away: 0 },
  home: { name: home, tla: home.slice(0, 3).toUpperCase() },
  away: { name: away, tla: away.slice(0, 3).toUpperCase() }, city: null,
});

describe('TodayView', () => {
  it('shows what-to-watch and a today match', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({ matches: [
        match(1, '2026-06-14T18:00:00Z', 'FINISHED', 'Mexico', 'Canada'),
        match(2, '2026-06-15T18:00:00Z', 'IN_PLAY', 'Brazil', 'Japan'),
      ] }),
    }));
    render(<TodayView now="2026-06-15T12:00:00Z" />);
    await waitFor(() => expect(screen.getByText(/what to watch/i)).toBeInTheDocument());
    expect(screen.getAllByText('Brazil')).toHaveLength(2);
    expect(screen.getByText(/recent results/i)).toBeInTheDocument();
  });

  it('shows a friendly empty state when nothing is on today', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({ matches: [match(3, '2026-06-20T18:00:00Z', 'SCHEDULED', 'Spain', 'Peru')] }),
    }));
    render(<TodayView now="2026-06-15T12:00:00Z" />);
    await waitFor(() => expect(screen.getByText(/no matches today/i)).toBeInTheDocument());
  });
});
