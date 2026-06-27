// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Bracket from './Bracket.jsx';

describe('Bracket (node-driven, enriched)', () => {
  it('renders every round label', () => {
    render(<Bracket matches={[]} standings={{ groups: [] }} />);
    expect(screen.getByText('Round of 32')).toBeInTheDocument();
    expect(screen.getByText('Final')).toBeInTheDocument();
    expect(screen.getByText('Third place')).toBeInTheDocument();
  });

  it('shows seed labels for undecided slots instead of bare TBD', () => {
    render(<Bracket matches={[]} standings={{ groups: [] }} />);
    expect(screen.getAllByText(/Grp [A-L] · (1st|2nd)/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3rd: [A-L]/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Semi-final loser/).length).toBeGreaterThan(0);
  });
});
