// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HowItWorks from './HowItWorks.jsx';

describe('HowItWorks', () => {
  it('explains the 2026 format basics', () => {
    render(<HowItWorks open onClose={() => {}} />);
    expect(screen.getByText(/12 groups/i)).toBeInTheDocument();
    expect(screen.getByText(/top 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Round of 32/i)).toBeInTheDocument();
  });
});
