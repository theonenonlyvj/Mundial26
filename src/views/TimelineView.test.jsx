// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TimelineView from './TimelineView.jsx';

afterEach(() => vi.restoreAllMocks());

const m = (id, utcDate, home, away) => ({
  id, utcDate, status: 'SCHEDULED', stage: 'GROUP_STAGE', score: { home: null, away: null },
  home: { name: home, tla: home.slice(0, 3).toUpperCase() }, away: { name: away, tla: away.slice(0, 3).toUpperCase() }, city: null,
});

const TZ = 'America/Chicago';

describe('TimelineView', () => {
  it('marks today and lists day groups', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true, json: async () => ({ matches: [
        m(1, '2026-06-15T18:00:00Z', 'Mexico', 'USA'),
        m(2, '2026-06-16T18:00:00Z', 'Brazil', 'Japan'),
      ] }),
    }));
    render(<TimelineView now="2026-06-15T12:00:00Z" timeZone={TZ} />);
    await waitFor(() => expect(screen.getByText('Mexico')).toBeInTheDocument());
    expect(screen.getByText(/Today/)).toBeInTheDocument();
    expect(screen.getByText(/earlier days are up/i)).toBeInTheDocument();
  });

  it('does not mark a non-today day', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true, json: async () => ({ matches: [
        m(1, '2026-06-15T18:00:00Z', 'Mexico', 'USA'),
        m(2, '2026-06-16T18:00:00Z', 'Brazil', 'Japan'),
      ] }),
    }));
    render(<TimelineView now="2026-06-15T12:00:00Z" timeZone={TZ} />);
    await waitFor(() => expect(screen.getByText('Brazil')).toBeInTheDocument());
    expect(document.querySelectorAll('[aria-current="date"]')).toHaveLength(1);
    expect(screen.getAllByText(/Today/).length).toBe(1);
  });

  it('groups a match past midnight UTC into the correct local day', async () => {
    // 2026-06-22T01:00:00Z = Jun 21 in Chicago (8 PM CDT)
    vi.stubGlobal('fetch', async () => ({
      ok: true, json: async () => ({ matches: [
        m(1, '2026-06-22T01:00:00Z', 'Argentina', 'Chile'),
      ] }),
    }));
    render(<TimelineView now="2026-06-21T18:00:00Z" timeZone={TZ} />);
    await waitFor(() => expect(screen.getByText('Argentina')).toBeInTheDocument());
    // Should be marked as today since it's still Jun 21 in Chicago
    expect(screen.getByText(/Today/)).toBeInTheDocument();
    expect(document.querySelectorAll('[aria-current="date"]')).toHaveLength(1);
    // Label should say Jun 21, not Jun 22
    expect(screen.getByText(/Jun 21/)).toBeInTheDocument();
  });
});
