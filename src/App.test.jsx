// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import App from './App.jsx';

beforeEach(() => vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({ matches: [] }) })));
afterEach(() => vi.restoreAllMocks());

describe('App', () => {
  it('renders the brand', async () => {
    await act(async () => { render(<App />); });
    expect(screen.getByRole('banner')).toHaveTextContent('Mundial26');
  });

  it('switches views via nav', async () => {
    await act(async () => { render(<App />); });
    fireEvent.click(screen.getByRole('button', { name: 'Standings' }));
    expect(screen.getByRole('region', { name: /standings/i })).toBeInTheDocument();
  });

  it('opens the How It Works modal', async () => {
    await act(async () => { render(<App />); });
    fireEvent.click(screen.getByRole('button', { name: /new to soccer/i }));
    expect(screen.getByRole('dialog', { name: /how the world cup works/i })).toBeInTheDocument();
  });
});
