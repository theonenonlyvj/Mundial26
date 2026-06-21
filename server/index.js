import { pathToFileURL } from 'node:url';
import express from 'express';
import { loadConfig } from './config.js';
import { createDataService } from './dataService.js';
import { buildRouter } from './routes.js';

export function createApp({ dataService } = {}) {
  const app = express();
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  if (dataService) app.use('/api', buildRouter(dataService));

  if (process.env.NODE_ENV === 'production') {
    const dist = new URL('../dist', import.meta.url).pathname;
    app.use(express.static(dist));
    app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));
    app.get('*', (_req, res) => res.sendFile(`${dist}/index.html`));
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
