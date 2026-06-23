// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ScorersView from './ScorersView.jsx';

const SCORERS = [
  { name: 'Kylian Mbappé', nationality: 'France', team: { tla: 'FRA', crest: 'fra.png' }, goals: 3, playedMatches: 2 },
  { name: 'Lionel Messi', nationality: 'Argentina', team: { tla: 'ARG', crest: 'arg.png' }, goals: 5, playedMatches: 2 },
];

function stubFetch(scorers) {
  vi.stubGlobal('fetch', async (url) => ({
    ok: true,
    json: async () => (String(url).includes('scorers') ? { scorers } : {}),
  }));
}

afterEach(() => vi.restoreAllMocks());

describe('ScorersView', () => {
  it('shows scorers ranked by goals with the leader crowned', async () => {
    stubFetch(SCORERS);
    await act(async () => { render(<ScorersView />); });

    const items = screen.getAllByRole('listitem');
    // Messi (5) ranks above Mbappé (3) despite input order.
    expect(items[0]).toHaveTextContent('Lionel Messi');
    expect(items[0]).toHaveTextContent('👑');
    expect(items[0]).toHaveTextContent('5');
    expect(items[1]).toHaveTextContent('Kylian Mbappé');
  });

  it('shows an empty state when nobody has scored', async () => {
    stubFetch([]);
    await act(async () => { render(<ScorersView />); });
    expect(screen.getByText(/no goals yet/i)).toBeInTheDocument();
  });
});
