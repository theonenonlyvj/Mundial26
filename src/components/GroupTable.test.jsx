// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GroupTable from './GroupTable.jsx';

const group = {
  group: 'GROUP_A',
  table: [
    { rank: 1, team: { name: 'Mexico', tla: 'MEX' }, played: 3, won: 3, draw: 0, lost: 0, goalsFor: 6, goalsAgainst: 1, goalDifference: 5, points: 9, status: 'through', note: 'Through to the knockout rounds 🎉' },
    { rank: 4, team: { name: 'Canada', tla: 'CAN' }, played: 3, won: 0, draw: 0, lost: 3, goalsFor: 1, goalsAgainst: 6, goalDifference: -5, points: 0, status: 'out', note: "Eliminated — can't reach the top two" },
  ],
};

describe('GroupTable', () => {
  it('renders the group label, teams and advancement badges', () => {
    render(<GroupTable group={group} />);
    expect(screen.getByText(/Group A/)).toBeInTheDocument();
    expect(screen.getByText('Mexico')).toBeInTheDocument();
    expect(screen.getAllByText(/Through/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Out/).length).toBeGreaterThan(0);
  });
});
