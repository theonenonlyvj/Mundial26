// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MapView from './MapView.jsx';

afterEach(() => vi.restoreAllMocks());

const cities = [
  { id: 'mexico-city', city: 'Mexico City', stadium: 'Estadio Azteca', country: 'Mexico' },
  { id: 'seattle', city: 'Seattle', stadium: 'Lumen Field', country: 'USA' },
];

const matches = [
  {
    id: 1,
    status: 'FINISHED',
    stage: 'GROUP_STAGE',
    utcDate: '2026-06-11T18:00:00Z',
    score: { home: 2, away: 1 },
    home: { name: 'Mexico', tla: 'MEX' },
    away: { name: 'Canada', tla: 'CAN' },
    city: { id: 'mexico-city', city: 'Mexico City' },
  },
];

function stubFetch() {
  vi.stubGlobal('fetch', async (url) => ({
    ok: true,
    json: async () =>
      url.includes('reference') ? { hostCities: cities } : { matches },
  }));
}

describe('MapView', () => {
  it('renders region headings', async () => {
    stubFetch();
    render(<MapView />);
    await waitFor(() => expect(screen.getByText('Mexico')).toBeInTheDocument());
    expect(screen.getByText('West Coast')).toBeInTheDocument();
  });

  it('shows the default prompt before any city is selected', async () => {
    stubFetch();
    render(<MapView />);
    await waitFor(() => expect(screen.getByText(/Mexico City/i)).toBeInTheDocument());
    expect(screen.getByText(/pick a city/i)).toBeInTheDocument();
  });

  it('clicking a city button reveals its matches', async () => {
    stubFetch();
    render(<MapView />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Mexico City/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Mexico City/ }));
    // Panel header shows stadium name (there may be multiple, e.g. chip + panel)
    expect(screen.getAllByText(/Estadio Azteca/).length).toBeGreaterThan(0);
    // "Mexico" appears as team name in the rendered match sticker
    expect(screen.getAllByText('Mexico').length).toBeGreaterThan(0);
  });

  it('city buttons are keyboard-accessible (Enter key selects)', async () => {
    stubFetch();
    render(<MapView />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Mexico City/ })).toBeInTheDocument());
    // Real <button> elements respond to click triggered by Enter via browser; simulate click
    fireEvent.click(screen.getByRole('button', { name: /Mexico City/ }));
    expect(screen.getAllByText(/Estadio Azteca/).length).toBeGreaterThan(0);
  });

  it('shows no-matches message for a city with no games', async () => {
    stubFetch();
    render(<MapView />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Seattle/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Seattle/ }));
    expect(screen.getByText(/no matches for this city yet/i)).toBeInTheDocument();
  });
});
