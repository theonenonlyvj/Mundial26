// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Bracket from './Bracket.jsx';

const team = (id, name) => ({ id, name, tla: name, crest: null });

describe('Bracket (responsive, topology-driven)', () => {
  it('renders the full round structure with labels', () => {
    render(<Bracket matches={[]} standings={{ groups: [] }} />);
    expect(screen.getByText('Round of 32')).toBeInTheDocument();
    expect(screen.getByText('Final')).toBeInTheDocument();
  });

  it('shows slot labels for undecided knockout matches', () => {
    render(<Bracket matches={[]} standings={{ groups: [] }} />);
    expect(screen.getAllByText(/Runner-up Group/i).length).toBeGreaterThan(0);
  });

  it('fills a resolved team into the bracket from a completed group', () => {
    const standings = {
      groups: [{ group: 'Group A', table: [1, 2, 3, 4].map((id) => ({ team: team(id, `A${id}`), played: 3 })) }],
    };
    // M79 = Winner Group A vs a third-place team — provide that live R32 match.
    const matches = [{
      id: 537400, stage: 'LAST_32', status: 'SCHEDULED', utcDate: '2026-07-01T18:00:00Z',
      score: {}, home: team(1, 'A1'), away: team(9, 'X9'), city: null,
    }];
    render(<Bracket matches={matches} standings={standings} />);
    expect(screen.getAllByText('A1').length).toBeGreaterThan(0);
  });
});
