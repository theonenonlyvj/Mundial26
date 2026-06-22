import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from './index.js';

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('CORS for the static-site origin', () => {
  afterEach(() => { delete process.env.CLIENT_ORIGIN; });

  it('echoes Access-Control-Allow-Origin when CLIENT_ORIGIN is set', async () => {
    process.env.CLIENT_ORIGIN = 'https://mundial26.onrender.com';
    const res = await request(createApp()).get('/api/health');
    expect(res.headers['access-control-allow-origin']).toBe('https://mundial26.onrender.com');
  });

  it('answers preflight OPTIONS with 204', async () => {
    process.env.CLIENT_ORIGIN = 'https://mundial26.onrender.com';
    const res = await request(createApp()).options('/api/matches');
    expect(res.status).toBe(204);
  });

  it('sends no CORS header when CLIENT_ORIGIN is unset', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
