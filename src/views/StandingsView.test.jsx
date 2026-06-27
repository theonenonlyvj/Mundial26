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
    await waitFor(() => expect(screen.getAllByText(/Group A/).length).toBeGreaterThan(0));
    expect(screen.getByText(/Into the knockouts/i)).toBeInTheDocument();
  });

  it('lifts the bracket above the tables once every group match is played', async () => {
    const matches = [
      { id: 1, stage: 'GROUP_STAGE', status: 'FINISHED', utcDate: '2026-06-12T00:00:00Z', score: {}, home: { name: 'A' }, away: { name: 'B' }, city: null },
      { id: 2, stage: 'LAST_32', status: 'SCHEDULED', utcDate: '2026-06-29T00:00:00Z', score: {}, home: { name: 'C' }, away: { name: 'D' }, city: null },
    ];
    vi.stubGlobal('fetch', async (url) => ({
      ok: true,
      json: async () => (url.includes('standings') ? standings : { matches }),
    }));
    render(<StandingsView />);
    await waitFor(() => expect(screen.getByText(/Final group standings/i)).toBeInTheDocument());
    const titles = screen.getAllByRole('heading').map((h) => h.textContent);
    const ko = titles.findIndex((t) => /knockout bracket/i.test(t));
    const fin = titles.findIndex((t) => /final group standings/i.test(t));
    expect(ko).toBeGreaterThanOrEqual(0);
    expect(ko).toBeLessThan(fin);
  });
});
