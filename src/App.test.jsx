// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('App', () => {
  it('renders the brand', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toHaveTextContent('Mundial26');
  });
});
