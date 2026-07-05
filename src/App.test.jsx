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

  it('shows a feedback / other-projects footer link to the bio site on every view', async () => {
    await act(async () => { render(<App />); });
    const link = screen.getByRole('link', { name: /click here/i });
    expect(link).toHaveAttribute('href', 'https://theonenonlyvj.github.io/personal-site');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByText(/have feedback/i)).toBeInTheDocument();
    // persists after switching views
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Standings' })); });
    expect(screen.getByRole('link', { name: /click here/i })).toBeInTheDocument();
  });

  it('does not show the explainer until the button is clicked, then opens it', async () => {
    await act(async () => { render(<App />); });
    expect(screen.queryByRole('dialog')).toBeNull(); // never auto-pops
    fireEvent.click(screen.getByRole('button', { name: /new to soccer/i }));
    expect(screen.getByRole('dialog', { name: /how the world cup works/i })).toBeInTheDocument();
  });
});
