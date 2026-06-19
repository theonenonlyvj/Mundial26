import express from 'express';
import { loadConfig } from './config.js';

export function createApp({ dataService } = {}) {
  const app = express();
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  // /api data routes are mounted in Task 1.8 via buildRouter(dataService)
  return app;
}

// Boot only when run directly (not when imported by tests).
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const config = loadConfig();
  createApp().listen(config.port, () => {
    console.log(`Mundial26 server on :${config.port}`);
  });
}
