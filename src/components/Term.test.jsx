// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Term from './Term.jsx';

describe('Term', () => {
  it('exposes the definition accessibly', () => {
    render(<Term define="Top two of each group advance.">group stage</Term>);
    const el = screen.getByText('group stage');
    expect(el).toHaveAttribute('title', 'Top two of each group advance.');
    expect(el).toHaveAttribute('aria-label', expect.stringContaining('group stage'));
  });
});
