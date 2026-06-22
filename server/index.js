import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import express from 'express';
import { loadConfig } from './config.js';
import { createDataService } from './dataService.js';
import { buildRouter } from './routes.js';

export function createApp({ dataService } = {}) {
  const app = express();

  // When the SPA is served from a separate Render static site it calls this API
  // cross-origin. Allow that one origin (set CLIENT_ORIGIN in the dashboard).
  const allowOrigin = process.env.CLIENT_ORIGIN;
  if (allowOrigin) {
    app.use((req, res, next) => {
      res.set('Access-Control-Allow-Origin', allowOrigin);
      res.set('Vary', 'Origin');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      next();
    });
  }

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  if (dataService) app.use('/api', buildRouter(dataService));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

  // Combined-deploy fallback: only serve the built SPA if it's present. The
  // API-only Render service has no dist/, so it stays a pure API server.
  if (process.env.NODE_ENV === 'production') {
    const dist = new URL('../dist', import.meta.url).pathname;
    if (existsSync(dist)) {
      app.use(express.static(dist));
      app.get('*', (_req, res) => res.sendFile(`${dist}/index.html`));
    }
  }
  return app;
}

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const config = loadConfig();
  const dataService = createDataService({ config });
  const server = createApp({ dataService }).listen(config.port, () => {
    console.log(`Mundial26 server on :${config.port} (api ${config.apiKey ? 'live' : 'snapshot'})`);
  });
  server.on('error', (err) => {
    console.error('Server failed to start:', err.message);
    process.exit(1);
  });
}
