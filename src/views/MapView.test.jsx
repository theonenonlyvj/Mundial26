// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MapView from './MapView.jsx';

afterEach(() => vi.restoreAllMocks());

const cities = [
  { id: 'mexico-city', city: 'Mexico City', stadium: 'Estadio Azteca', country: 'Mexico', lat: 19.3, lng: -99.15 },
  { id: 'toronto', city: 'Toronto', stadium: 'BMO Field', country: 'Canada', lat: 43.6, lng: -79.4 },
];
const matches = [
  { id: 1, status: 'FINISHED', stage: 'GROUP_STAGE', utcDate: '2026-06-11T18:00:00Z', score: { home: 2, away: 1 },
    home: { name: 'Mexico', tla: 'MEX' }, away: { name: 'Canada', tla: 'CAN' }, city: { id: 'mexico-city', city: 'Mexico City' } },
];

describe('MapView', () => {
  it('shows pins and reveals a city\'s matches on click', async () => {
    vi.stubGlobal('fetch', async (url) => ({
      ok: true,
      json: async () => (url.includes('reference') ? { hostCities: cities } : { matches }),
    }));
    render(<MapView />);
    await waitFor(() => expect(screen.getByLabelText('Mexico City')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Mexico City'));
    expect(screen.getByText(/Estadio Azteca/)).toBeInTheDocument();
    expect(screen.getByText('Mexico')).toBeInTheDocument();
  });
});
