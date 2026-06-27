// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Bracket from './Bracket.jsx';

const km = {
  id: 1, stage: 'FINAL', status: 'SCHEDULED', utcDate: '2026-07-19T19:00:00Z',
  score: { home: null, away: null }, home: { name: 'TBD' }, away: { name: 'TBD' }, city: null,
};

describe('Bracket', () => {
  it('renders a round label when knockout matches exist', () => {
    render(<Bracket matches={[km]} />);
    expect(screen.getByText(/Final/)).toBeInTheDocument();
  });

  it('shows the placeholder before any knockout games', () => {
    render(<Bracket matches={[{ id: 2, stage: 'GROUP_STAGE', utcDate: '2026-06-12T00:00:00Z', score: {}, home: { name: 'A' }, away: { name: 'B' } }]} />);
    expect(screen.getByText(/fills in once the groups finish/i)).toBeInTheDocument();
  });

  it('marks the earliest unfinished round as current', () => {
    const matches = [
      { id: 1, stage: 'LAST_32', status: 'FINISHED', utcDate: '2026-06-28T00:00:00Z', score: {}, home: { name: 'A' }, away: { name: 'B' } },
      { id: 2, stage: 'LAST_16', status: 'SCHEDULED', utcDate: '2026-07-03T00:00:00Z', score: {}, home: { name: 'C' }, away: { name: 'D' } },
    ];
    const { container } = render(<Bracket matches={matches} />);
    const current = container.querySelector('[data-current="true"] h3');
    expect(current).not.toBeNull();
    expect(current.textContent).toMatch(/Round of 16/);
  });
});
