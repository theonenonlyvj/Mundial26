// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Term from './Term.jsx';

describe('Term', () => {
  it('exposes the definition accessibly', () => {
    render(<Term define="Top two of each group advance.">group stage</Term>);
    const el = screen.getByText('group stage');
    expect(el).toHaveAttribute('title', 'Top two of each group advance.');
    expect(el).toHaveAttribute('aria-label', expect.stringContaining('group stage'));
  });

  it('reveals the definition on tap/click and hides it again (mobile-safe, not hover-only)', () => {
    render(<Term define="Top two of each group advance.">group stage</Term>);
    const btn = screen.getByRole('button', { name: /group stage/i });
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.click(btn);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Top two of each group advance.');
    fireEvent.click(btn);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
