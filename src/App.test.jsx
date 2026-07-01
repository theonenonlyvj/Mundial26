// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import App from './App.jsx';

beforeEach(() => vi.stubGlobal('fetch', async (url) => ({
  ok: true,
  json: async () => {
    if (url.includes('standings')) return { groups: [], bestThirdIds: [] };
    if (url.includes('reference')) return { hostCities: [] };
    if (url.includes('scorers')) return { scorers: [] };
    return { matches: [] };
  },
})));
afterEach(() => vi.restoreAllMocks());

describe('App', () => {
  it('renders the brand', async () => {
    await act(async () => { render(<App />); });
    expect(screen.getByRole('banner')).toHaveTextContent('Mundial26');
  });

  it('switches views via nav', async () => {
    await act(async () => { render(<App />); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Standings' })); });
    expect(screen.getByRole('region', { name: /standings/i })).toBeInTheDocument();
  });

  it('has a Scorers tab that opens the leaderboard', async () => {
    await act(async () => { render(<App />); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Scorers' })); });
    expect(screen.getByRole('region', { name: /scorers/i })).toBeInTheDocument();
  });

  it('opens the How It Works modal', async () => {
    await act(async () => { render(<App />); });
    fireEvent.click(screen.getByRole('button', { name: /new to soccer/i }));
    expect(screen.getByRole('dialog', { name: /how the world cup works/i })).toBeInTheDocument();
  });

  it('auto-opens the explainer for a first-time visitor', async () => {
    localStorage.removeItem('m26_seenHowItWorks'); // fresh visitor
    await act(async () => { render(<App />); });
    expect(screen.getByRole('dialog', { name: /how the world cup works/i })).toBeInTheDocument();
  });

  it('does not auto-open for a returning visitor', async () => {
    // vitest.setup marks every test a returning visitor by default
    await act(async () => { render(<App />); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('persists the seen flag when the explainer is closed', async () => {
    localStorage.removeItem('m26_seenHowItWorks');
    await act(async () => { render(<App />); }); // first visit -> auto-opens
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /close/i })); });
    expect(localStorage.getItem('m26_seenHowItWorks')).toBe('1');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
