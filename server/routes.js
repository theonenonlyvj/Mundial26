import { Router } from 'express';
import { HOST_CITIES } from './data/hostCities.js';

export function buildRouter(dataService) {
  const router = Router();
  const send = (fn) => async (_req, res) => {
    try {
      res.json(await fn());
    } catch (err) {
      res.status(502).json({ error: 'upstream_unavailable', message: err?.message ?? String(err) });
    }
  };
  router.get('/matches', send(() => dataService.getMatches()));
  router.get('/standings', send(() => dataService.getStandings()));
  router.get('/scorers', send(() => dataService.getScorers()));
  router.get('/reference', (_req, res) => res.json({ hostCities: HOST_CITIES }));
  return router;
}
