import { Router } from 'express';

export function buildRouter(dataService) {
  const router = Router();
  const send = (fn) => async (_req, res) => {
    try {
      res.json(await fn());
    } catch (err) {
      res.status(502).json({ error: 'upstream_unavailable', message: err.message });
    }
  };
  router.get('/matches', send(() => dataService.getMatches()));
  router.get('/standings', send(() => dataService.getStandings()));
  router.get('/scorers', send(() => dataService.getScorers()));
  return router;
}
