// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TodayView from './TodayView.jsx';

afterEach(() => vi.restoreAllMocks());

describe('TodayView', () => {
  it('renders matches from the api', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({ matches: [
        { id: 1, status: 'FINISHED', score: { home: 2, away: 1 },
          home: { name: 'Mexico', tla: 'MEX' }, away: { name: 'Canada', tla: 'CAN' }, city: null },
      ] }),
    }));
    render(<TodayView />);
    await waitFor(() => expect(screen.getByText('Mexico')).toBeInTheDocument());
  });
});
