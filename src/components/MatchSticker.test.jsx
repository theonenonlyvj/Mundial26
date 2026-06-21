// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MatchSticker from './MatchSticker.jsx';

const base = {
  home: { name: 'Mexico', tla: 'MEX' }, away: { name: 'Canada', tla: 'CAN' },
  city: { city: 'Mexico City' },
};

describe('MatchSticker', () => {
  it('shows the score and LIVE chip when in play', () => {
    render(<MatchSticker match={{ ...base, status: 'IN_PLAY', score: { home: 1, away: 0 } }} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('shows kickoff time when scheduled', () => {
    render(<MatchSticker match={{ ...base, status: 'SCHEDULED', utcDate: '2026-06-15T18:00:00Z', score: { home: null, away: null } }} />);
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
    expect(screen.getByTestId('kickoff')).toBeInTheDocument();
  });
});
