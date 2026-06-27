// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BracketTree from './BracketTree.jsx';
import { resolveBracket } from '../lib/bracketTree.js';

describe('BracketTree (desktop)', () => {
  it('renders the round headers and connector lines without error', () => {
    const { nodes } = resolveBracket([], { groups: [] });
    const { container } = render(<BracketTree nodes={nodes} currentRound="LAST_32" />);
    expect(screen.getByText('Round of 32')).toBeInTheDocument();
    expect(screen.getByText('Final')).toBeInTheDocument();
    // Connector paths drawn from the topology (R16..Final + 3rd each have feeders).
    expect(container.querySelectorAll('path.btree__line').length).toBeGreaterThan(0);
  });
});
