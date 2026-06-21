// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Legend from './Legend.jsx';
import TiebreakerExplainer from './TiebreakerExplainer.jsx';

describe('Legend + TiebreakerExplainer', () => {
  it('legend lists the three statuses', () => {
    render(<Legend />);
    expect(screen.getByText(/Through/)).toBeInTheDocument();
    expect(screen.getByText(/Alive/)).toBeInTheDocument();
    expect(screen.getByText(/Out/)).toBeInTheDocument();
  });
  it('tiebreaker explainer lists goal difference', () => {
    render(<TiebreakerExplainer />);
    expect(screen.getByText(/goal difference/i)).toBeInTheDocument();
  });
});
