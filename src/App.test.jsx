// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import App from './App.jsx';

describe('App', () => {
  it('renders the brand', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toHaveTextContent('Mundial26');
  });
});

it('switches views via nav', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Standings' }));
  expect(screen.getByRole('region', { name: /standings/i })).toBeInTheDocument();
});
