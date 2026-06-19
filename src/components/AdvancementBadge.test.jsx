// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdvancementBadge from './AdvancementBadge.jsx';

describe('AdvancementBadge', () => {
  it('labels each status', () => {
    const { rerender } = render(<AdvancementBadge status="through" />);
    expect(screen.getByText(/Through/)).toBeInTheDocument();
    rerender(<AdvancementBadge status="out" />);
    expect(screen.getByText(/Out/)).toBeInTheDocument();
    rerender(<AdvancementBadge status="alive" />);
    expect(screen.getByText(/Alive/)).toBeInTheDocument();
  });
});
