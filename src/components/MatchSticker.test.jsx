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

  it('shows channel line when channels present', () => {
    render(<MatchSticker match={{ ...base, status: 'SCHEDULED', utcDate: '2026-06-15T18:00:00Z', score: { home: null, away: null }, channels: { en: 'FOX', es: 'Telemundo' } }} />);
    expect(screen.getByText(/FOX/)).toBeInTheDocument();
    expect(screen.getByText(/Telemundo/)).toBeInTheDocument();
  });

  it('does not render channel line when channels is null', () => {
    render(<MatchSticker match={{ ...base, status: 'SCHEDULED', utcDate: '2026-06-15T18:00:00Z', score: { home: null, away: null }, channels: null }} />);
    expect(screen.queryByText(/📺/)).not.toBeInTheDocument();
  });

  it('shows numeric date for a match 7+ days out', () => {
    const now = '2026-07-19T18:00:00Z';
    render(<MatchSticker match={{ ...base, status: 'SCHEDULED', utcDate: '2026-07-26T20:00:00Z', score: { home: null, away: null } }} now={now} />);
    expect(screen.getByTestId('kickoff').textContent).toMatch(/\d{1,2}\/\d{1,2}/);
  });

  it('shows weekday for a near match (2 days out)', () => {
    const now = '2026-07-19T18:00:00Z';
    render(<MatchSticker match={{ ...base, status: 'SCHEDULED', utcDate: '2026-07-21T20:00:00Z', score: { home: null, away: null } }} now={now} />);
    expect(screen.getByTestId('kickoff').textContent).toMatch(/^[A-Za-z]{3} /);
  });

  it('tags the stage (group or knockout round)', () => {
    const { rerender } = render(<MatchSticker match={{ ...base, status: 'SCHEDULED', stage: 'GROUP_STAGE', group: 'GROUP_B', utcDate: '2026-06-15T18:00:00Z', score: {} }} />);
    expect(screen.getByText('Group B')).toBeInTheDocument();
    rerender(<MatchSticker match={{ ...base, status: 'SCHEDULED', stage: 'LAST_16', utcDate: '2026-07-05T18:00:00Z', score: {} }} />);
    expect(screen.getByText('Round of 16')).toBeInTheDocument();
  });

  it('hides the stage tag when showStage is false', () => {
    render(<MatchSticker showStage={false} match={{ ...base, status: 'SCHEDULED', stage: 'LAST_16', utcDate: '2026-07-05T18:00:00Z', score: {} }} />);
    expect(screen.queryByText('Round of 16')).not.toBeInTheDocument();
  });

  it('shows the live phase (halftime / 2nd half) on a live match', () => {
    const { rerender } = render(<MatchSticker match={{ ...base, status: 'PAUSED', score: { home: 1, away: 0, halfTime: { home: 1, away: 0 } } }} />);
    expect(screen.getByText(/halftime/i)).toBeInTheDocument();
    rerender(<MatchSticker match={{ ...base, status: 'IN_PLAY', score: { home: 1, away: 0, halfTime: { home: 0, away: 0 } } }} />);
    expect(screen.getByText(/2nd half/i)).toBeInTheDocument();
  });
});
