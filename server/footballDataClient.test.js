import { describe, it, expect } from 'vitest';
import { createFootballDataClient } from './footballDataClient.js';

function fakeFetch(captured) {
  return async (url, opts) => {
    captured.url = url;
    captured.headers = opts?.headers || {};
    return { ok: true, status: 200, json: async () => ({ matches: [] }) };
  };
}

describe('footballDataClient', () => {
  it('calls the WC matches endpoint with the auth header', async () => {
    const captured = {};
    const client = createFootballDataClient({ apiKey: 'KEY', fetchImpl: fakeFetch(captured) });
    const data = await client.getMatches();
    expect(captured.url).toContain('/competitions/WC/matches');
    expect(captured.headers['X-Auth-Token']).toBe('KEY');
    expect(data).toEqual({ matches: [] });
  });

  it('throws on non-2xx', async () => {
    const client = createFootballDataClient({
      apiKey: 'KEY',
      fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({}) }),
    });
    await expect(client.getMatches()).rejects.toThrow('429');
  });
});
