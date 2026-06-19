import path from 'node:path';
import express from 'express';
import { loadConfig } from './config.js';
import { createDataService } from './dataService.js';
import { buildRouter } from './routes.js';

export function createApp({ dataService } = {}) {
  const app = express();
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  if (dataService) app.use('/api', buildRouter(dataService));

  if (process.env.NODE_ENV === 'production') {
    const dist = path.resolve('dist');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  return app;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const config = loadConfig();
  const dataService = createDataService({ config });
  createApp({ dataService }).listen(config.port, () => {
    console.log(`Mundial26 server on :${config.port} (api ${config.apiKey ? 'live' : 'snapshot'})`);
  });
}
