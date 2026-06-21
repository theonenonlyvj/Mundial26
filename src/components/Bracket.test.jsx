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
});
