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

const TZ = 'America/Chicago';

describe('TodayView', () => {
  it('shows what-to-watch and a today match', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({ matches: [
        match(1, '2026-06-14T18:00:00Z', 'FINISHED', 'Mexico', 'Canada'),
        match(2, '2026-06-15T18:00:00Z', 'IN_PLAY', 'Brazil', 'Japan'),
      ] }),
    }));
    render(<TodayView now="2026-06-15T12:00:00Z" timeZone={TZ} />);
    await waitFor(() => expect(screen.getByText(/what to watch/i)).toBeInTheDocument());
    expect(screen.getAllByText('Brazil')).toHaveLength(2);
    expect(screen.getByText(/recent results/i)).toBeInTheDocument();
  });

  it('shows a friendly empty state when nothing is on today', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({ matches: [match(3, '2026-06-20T18:00:00Z', 'SCHEDULED', 'Spain', 'Peru')] }),
    }));
    render(<TodayView now="2026-06-15T12:00:00Z" timeZone={TZ} />);
    await waitFor(() => expect(screen.getByText(/no matches today/i)).toBeInTheDocument());
  });

  it('shows On Today / Coming Up / Recent Results headings in correct order', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({ matches: [
        match(1, '2026-06-14T18:00:00Z', 'FINISHED', 'Mexico', 'Canada'),
        match(2, '2026-06-15T14:00:00Z', 'SCHEDULED', 'Brazil', 'Japan'),
        match(3, '2026-06-16T18:00:00Z', 'SCHEDULED', 'Spain', 'Peru'),
      ] }),
    }));
    render(<TodayView now="2026-06-15T12:00:00Z" timeZone={TZ} />);
    await waitFor(() => expect(screen.getByText(/on today/i)).toBeInTheDocument());
    expect(screen.getByText(/coming up/i)).toBeInTheDocument();
    expect(screen.getByText(/recent results/i)).toBeInTheDocument();

    // Verify section order: On Today before Coming Up before Recent Results
    const headings = screen.getAllByRole('heading', { level: 2 });
    const titles = headings.map((h) => h.textContent);
    const onTodayIdx = titles.findIndex((t) => /on today/i.test(t));
    const comingUpIdx = titles.findIndex((t) => /coming up/i.test(t));
    const recentIdx = titles.findIndex((t) => /recent results/i.test(t));
    expect(onTodayIdx).toBeLessThan(comingUpIdx);
    expect(comingUpIdx).toBeLessThan(recentIdx);
  });

  it('shows timezone note', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({ matches: [match(2, '2026-06-15T18:00:00Z', 'SCHEDULED', 'Brazil', 'Japan')] }),
    }));
    render(<TodayView now="2026-06-15T12:00:00Z" timeZone={TZ} />);
    await waitFor(() => expect(screen.getByText(/kickoff times shown in your local time zone/i)).toBeInTheDocument());
  });
});
