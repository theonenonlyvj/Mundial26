import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // No dev proxy anymore: the app is ARCHIVED (src/archive.js) — all data comes
  // from the bundled final snapshot (src/data/final/*), and the Cloudflare
  // Worker backend is retired. The old proxy config is in git history if the
  // app is ever un-archived.
  build: { outDir: 'dist' },
});
