// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WhatToWatch from './WhatToWatch.jsx';

const live = {
  id: 9, status: 'IN_PLAY', stage: 'GROUP_STAGE', utcDate: '2026-06-15T18:00:00Z',
  score: { home: 1, away: 1 }, home: { name: 'Brazil', tla: 'BRA' }, away: { name: 'Japan', tla: 'JPN' }, city: null,
};

describe('WhatToWatch', () => {
  it('headlines the live match with its reason', () => {
    render(<WhatToWatch matches={[live]} />);
    expect(screen.getByText(/live right now/i)).toBeInTheDocument();
    expect(screen.getByText('Brazil')).toBeInTheDocument();
  });
  it('renders nothing when empty', () => {
    const { container } = render(<WhatToWatch matches={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
