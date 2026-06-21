import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { buildRouter } from './routes.js';

const fakeService = {
  getMatches: async () => ({ updatedAt: null, stale: true, matches: [{ id: 1 }] }),
  getStandings: async () => ({ updatedAt: null, stale: true, groups: [], bestThirdIds: [] }),
  getScorers: async () => ({ updatedAt: null, stale: true, scorers: [] }),
};

function app() {
  const a = express();
  a.use('/api', buildRouter(fakeService));
  return a;
}

describe('api routes', () => {
  it('GET /api/matches returns matches', async () => {
    const res = await request(app()).get('/api/matches');
    expect(res.status).toBe(200);
    expect(res.body.matches).toEqual([{ id: 1 }]);
  });
  it('GET /api/standings returns groups', async () => {
    const res = await request(app()).get('/api/standings');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('bestThirdIds');
  });
  it('GET /api/scorers returns scorers', async () => {
    const res = await request(app()).get('/api/scorers');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('scorers');
  });
  it('GET /api/matches returns 502 on service error', async () => {
    const broken = { ...fakeService, getMatches: async () => { throw new Error('boom'); } };
    const a = express(); a.use('/api', buildRouter(broken));
    const res = await request(a).get('/api/matches');
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('upstream_unavailable');
    expect(res.body.message).toBe('boom');
  });
  it('GET /api/reference returns host cities', async () => {
    const res = await request(app()).get('/api/reference');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.hostCities)).toBe(true);
    expect(res.body.hostCities.length).toBe(16);
  });
});
