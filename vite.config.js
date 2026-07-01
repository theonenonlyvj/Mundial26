import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Local dev fetches live data straight from the Cloudflare Worker (the real
    // backend) — there is no local API server. The SPA calls same-origin `/api`,
    // which this proxies to the Worker.
    proxy: {
      '/api': { target: 'https://mundial26-data.theonenonlyvj.workers.dev', changeOrigin: true },
    },
  },
  build: { outDir: 'dist' },
});
