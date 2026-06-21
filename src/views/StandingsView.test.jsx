// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import StandingsView from './StandingsView.jsx';

afterEach(() => vi.restoreAllMocks());

const standings = {
  groups: [{ group: 'GROUP_A', table: [
    { rank: 1, team: { name: 'Mexico', tla: 'MEX' }, played: 3, won: 3, draw: 0, lost: 0, goalsFor: 6, goalsAgainst: 1, goalDifference: 5, points: 9, status: 'through', note: 'Through to the knockout rounds 🎉' },
  ] }],
  bestThirdIds: [],
};

describe('StandingsView', () => {
  it('renders the legend and a group table', async () => {
    vi.stubGlobal('fetch', async (url) => ({
      ok: true,
      json: async () => (url.includes('standings') ? standings : { matches: [] }),
    }));
    render(<StandingsView />);
    await waitFor(() => expect(screen.getByText(/Group A/)).toBeInTheDocument());
    expect(screen.getByText(/Into the knockouts/i)).toBeInTheDocument();
  });
});
