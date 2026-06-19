# Mundial26 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a deployable Mundial26 skeleton: a tested Express backend that serves normalized World Cup data (with caching + snapshot fallback) and a React/Vite frontend with the Panini design-system primitives and an app shell that renders real data end-to-end.

**Architecture:** A single Node/Express service holds the football-data.org API key, proxies `/api/*`, caches responses in memory (TTL + last-good fallback), and merges upstream data with bundled static reference data. In production Express also serves the built React SPA. The frontend is a Vite + React 18 SPA; in dev it proxies `/api` to Express.

**Tech Stack:** Node 20+ (ESM), Express 4, React 18, Vite 5, Vitest + @testing-library/react + supertest, Node global `fetch`. Deploy: Render (single web service).

## Global Constraints

- **No live tick.** Data is fetched and cached; never poll on an interval or use websockets. Cache TTL is 2–5 min.
- **API key is server-only.** `FOOTBALL_DATA_API_KEY` is read from env in `server/` and sent only via the `X-Auth-Token` header. It must never reach the browser or be committed.
- **Snapshot fallback always works.** Every data path must degrade to the committed snapshot JSON when the API key is absent or upstream errors with no cache — so the app and tests run offline.
- **2026 format is fixed:** 48 teams, 12 groups A–L of 4. Win=3, draw=1, loss=0. Top 2 per group + 8 best 3rd-place teams advance to a Round of 32.
- **ESM everywhere** (`"type": "module"` in package.json). Use `import`/`export`, not `require`.
- **Determinism:** never call `Date.now()`/`new Date()`/`Math.random()` inside library code without injecting it as a parameter — pass a `now()` clock so tests are deterministic.
- **Node toolchain:** `npm -v` must be ≥ 9 before installing (local default is an old 6.x shim — see Task 0.1).

---

## File Structure

```
mundial26/
  package.json              # ESM, scripts, deps
  vite.config.js            # React plugin, dev proxy /api -> :3000, build to dist/
  vitest.config.js          # test config (node default; jsdom via per-file pragma)
  render.yaml               # Render web service definition
  .env.example              # FOOTBALL_DATA_API_KEY=
  server/
    index.js                # Express entry: /api routes + static SPA in prod
    config.js               # env -> { apiKey, port, ttls }
    cache.js                # createCache + createCachedFetcher (TTL + last-good)
    footballDataClient.js   # football-data.org v4 client (X-Auth-Token)
    normalize.js            # upstream shapes -> app shapes
    standings.js            # rankGroup, compareRows, advancementStatus, bestThirds
    dataService.js          # client + cache + normalize + static merge + snapshot fallback
    routes.js               # buildRouter(dataService) -> Express router
    data/
      hostCities.js         # 16 host cities/stadiums + coords
      groups.js             # groups A–L team lists
      snapshot.json         # committed sample matches+standings (fallback + tests)
  src/
    main.jsx                # React root
    App.jsx                 # shell: nav + view switch
    api/client.js           # fetch wrapper to /api
    theme/
      tokens.css            # Panini design tokens (color, type, texture, radii)
      global.css            # resets + base
    components/
      StickerCard.jsx
      TeamSticker.jsx
      MatchSticker.jsx
      AdvancementBadge.jsx
      Term.jsx              # glossary tooltip primitive (used heavily in Plan 2)
  index.html                # Vite entry
```

**Test files** are co-located as `*.test.js` / `*.test.jsx` next to the unit under test. Component tests begin with `// @vitest-environment jsdom`.

---

## Phase 0 — Scaffold & Toolchain

### Task 0.1: Toolchain + project init

**Files:**
- Create: `package.json`, `.env.example`, `index.html`, `vite.config.js`, `vitest.config.js`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `start`, `test`; ESM project; installed deps.

- [ ] **Step 1: Fix npm.** Run `npm -v`. If it prints `6.x` or anything `< 9`, run:

```bash
npm install -g npm@latest
hash -r
npm -v   # expect >= 10
```
If the global install is blocked, use the npm bundled with Node instead: `corepack enable && corepack prepare npm@latest --activate`, then re-check `npm -v`.

- [ ] **Step 2: Create `package.json`:**

```json
{
  "name": "mundial26",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "concurrently -k -n api,web -c blue,magenta \"node server/index.js\" \"vite\"",
    "build": "vite build",
    "start": "NODE_ENV=production node server/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "express": "^4.19.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "concurrently": "^8.2.0",
    "jsdom": "^24.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "supertest": "^7.0.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 3: Install:** `npm install` — expect it to complete and create `node_modules/` + `package-lock.json`.

- [ ] **Step 4: Create `.env.example`:**

```
# Get a free key at https://www.football-data.org/client/register
FOOTBALL_DATA_API_KEY=
PORT=3000
```

- [ ] **Step 5: Create `index.html`:**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mundial26 — World Cup 2026</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `vite.config.js`:**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: { outDir: 'dist' },
});
```

- [ ] **Step 7: Create `vitest.config.js`:**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
  },
});
```

- [ ] **Step 8: Create `vitest.setup.js`:**

```js
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 9: Commit:**

```bash
git add -A && git commit -m "chore: scaffold project (npm, vite, vitest, express)"
```

### Task 0.2: Express server with health route

**Files:**
- Create: `server/config.js`, `server/index.js`, `server/index.test.js`

**Interfaces:**
- Produces: `createApp({ dataService? })` returning an Express app; `GET /api/health` -> `{ ok: true }`. `loadConfig(env)` -> `{ apiKey, port, ttls }`.

- [ ] **Step 1: Write the failing test** `server/index.test.js`:

```js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './index.js';

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails:** `npx vitest run server/index.test.js` — Expected: FAIL (`createApp` not exported / file missing).

- [ ] **Step 3: Create `server/config.js`:**

```js
export function loadConfig(env = process.env) {
  return {
    apiKey: env.FOOTBALL_DATA_API_KEY || '',
    port: Number(env.PORT) || 3000,
    ttls: { matches: 120_000, standings: 120_000, scorers: 300_000 },
  };
}
```

- [ ] **Step 4: Create `server/index.js`:**

```js
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
```

- [ ] **Step 5: Run test to verify it passes:** `npx vitest run server/index.test.js` — Expected: PASS.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat(server): express app with health route"`

### Task 0.3: React skeleton renders

**Files:**
- Create: `src/main.jsx`, `src/App.jsx`, `src/theme/global.css`, `src/App.test.jsx`

**Interfaces:**
- Produces: `<App />` default export rendering a header with the text "Mundial26".

- [ ] **Step 1: Write the failing test** `src/App.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('App', () => {
  it('renders the brand', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toHaveTextContent('Mundial26');
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/App.test.jsx` — Expected: FAIL (no `App.jsx`).

- [ ] **Step 3: Create `src/theme/global.css`:**

```css
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; }
```

- [ ] **Step 4: Create `src/App.jsx`:**

```jsx
import './theme/global.css';

export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>Mundial26</h1>
      </header>
      <main className="app__main" />
    </div>
  );
}
```

- [ ] **Step 5: Create `src/main.jsx`:**

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 6: Run to verify it passes:** `npx vitest run src/App.test.jsx` — Expected: PASS.

- [ ] **Step 7: Manual check:** run `npm run dev`, open the Vite URL, confirm "Mundial26" renders. Stop the dev server.

- [ ] **Step 8: Commit:** `git add -A && git commit -m "feat(web): react skeleton renders app shell"`

---

## Phase 1 — Backend Data Layer

### Task 1.1: Host cities reference data

**Files:**
- Create: `server/data/hostCities.js`, `server/data/hostCities.test.js`

**Interfaces:**
- Produces: `HOST_CITIES` — array of `{ id, city, stadium, country, lat, lng }` (id is a kebab slug). `getHostCity(id)` -> city or `undefined`.

- [ ] **Step 1: Write the failing test** `server/data/hostCities.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { HOST_CITIES, getHostCity } from './hostCities.js';

describe('host cities', () => {
  it('has all 16 host cities', () => {
    expect(HOST_CITIES).toHaveLength(16);
  });
  it('each has coordinates and a country', () => {
    for (const c of HOST_CITIES) {
      expect(typeof c.lat).toBe('number');
      expect(typeof c.lng).toBe('number');
      expect(['USA', 'Canada', 'Mexico']).toContain(c.country);
    }
  });
  it('looks up by id', () => {
    expect(getHostCity('mexico-city')?.stadium).toBe('Estadio Azteca');
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run server/data/hostCities.test.js` — Expected: FAIL.

- [ ] **Step 3: Create `server/data/hostCities.js`** (coordinates are approximate stadium locations):

```js
export const HOST_CITIES = [
  { id: 'atlanta', city: 'Atlanta', stadium: 'Mercedes-Benz Stadium', country: 'USA', lat: 33.755, lng: -84.401 },
  { id: 'boston', city: 'Boston', stadium: 'Gillette Stadium', country: 'USA', lat: 42.091, lng: -71.264 },
  { id: 'dallas', city: 'Dallas', stadium: 'AT&T Stadium', country: 'USA', lat: 32.748, lng: -97.093 },
  { id: 'houston', city: 'Houston', stadium: 'NRG Stadium', country: 'USA', lat: 29.685, lng: -95.411 },
  { id: 'kansas-city', city: 'Kansas City', stadium: 'Arrowhead Stadium', country: 'USA', lat: 39.049, lng: -94.484 },
  { id: 'los-angeles', city: 'Los Angeles', stadium: 'SoFi Stadium', country: 'USA', lat: 33.953, lng: -118.339 },
  { id: 'miami', city: 'Miami', stadium: 'Hard Rock Stadium', country: 'USA', lat: 25.958, lng: -80.239 },
  { id: 'new-york', city: 'New York / New Jersey', stadium: 'MetLife Stadium', country: 'USA', lat: 40.814, lng: -74.074 },
  { id: 'philadelphia', city: 'Philadelphia', stadium: 'Lincoln Financial Field', country: 'USA', lat: 39.901, lng: -75.168 },
  { id: 'bay-area', city: 'San Francisco Bay Area', stadium: "Levi's Stadium", country: 'USA', lat: 37.403, lng: -121.970 },
  { id: 'seattle', city: 'Seattle', stadium: 'Lumen Field', country: 'USA', lat: 47.595, lng: -122.332 },
  { id: 'guadalajara', city: 'Guadalajara', stadium: 'Estadio Akron', country: 'Mexico', lat: 20.682, lng: -103.462 },
  { id: 'mexico-city', city: 'Mexico City', stadium: 'Estadio Azteca', country: 'Mexico', lat: 19.303, lng: -99.150 },
  { id: 'monterrey', city: 'Monterrey', stadium: 'Estadio BBVA', country: 'Mexico', lat: 25.669, lng: -100.244 },
  { id: 'toronto', city: 'Toronto', stadium: 'BMO Field', country: 'Canada', lat: 43.633, lng: -79.418 },
  { id: 'vancouver', city: 'Vancouver', stadium: 'BC Place', country: 'Canada', lat: 49.277, lng: -123.112 },
];

const byId = new Map(HOST_CITIES.map((c) => [c.id, c]));
export function getHostCity(id) {
  return byId.get(id);
}
```

- [ ] **Step 4: Run to verify it passes:** `npx vitest run server/data/hostCities.test.js` — Expected: PASS.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(data): 16 host cities reference data"`

### Task 1.2: Group definitions reference data

**Files:**
- Create: `server/data/groups.js`, `server/data/groups.test.js`

**Interfaces:**
- Produces: `GROUP_KEYS` — `['GROUP_A', ..., 'GROUP_L']` (12 keys). `groupLabel(key)` -> e.g. `'Group A'`.

- [ ] **Step 1: Write the failing test** `server/data/groups.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { GROUP_KEYS, groupLabel } from './groups.js';

describe('groups', () => {
  it('has 12 groups A–L', () => {
    expect(GROUP_KEYS).toHaveLength(12);
    expect(GROUP_KEYS[0]).toBe('GROUP_A');
    expect(GROUP_KEYS[11]).toBe('GROUP_L');
  });
  it('labels a group key', () => {
    expect(groupLabel('GROUP_C')).toBe('Group C');
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run server/data/groups.test.js` — Expected: FAIL.

- [ ] **Step 3: Create `server/data/groups.js`:**

```js
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export const GROUP_KEYS = LETTERS.map((l) => `GROUP_${l}`);

export function groupLabel(key) {
  const letter = key.replace('GROUP_', '');
  return `Group ${letter}`;
}
```

- [ ] **Step 4: Run to verify it passes:** `npx vitest run server/data/groups.test.js` — Expected: PASS.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(data): group key helpers"`

### Task 1.3: TTL cache with last-good fallback

**Files:**
- Create: `server/cache.js`, `server/cache.test.js`

**Interfaces:**
- Produces:
  - `createCache({ now })` -> `{ get(key) -> { hit, stale, value }, set(key, value, ttlMs) }`
  - `createCachedFetcher({ cache, fetcher, ttlMs, now })` -> `async (key) -> { value, fromCache, stale, error? }`

- [ ] **Step 1: Write the failing test** `server/cache.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createCache, createCachedFetcher } from './cache.js';

describe('createCache', () => {
  it('returns fresh then stale as time passes', () => {
    let t = 0;
    const cache = createCache({ now: () => t });
    cache.set('k', 'v', 100);
    expect(cache.get('k')).toMatchObject({ hit: true, stale: false, value: 'v' });
    t = 150;
    expect(cache.get('k')).toMatchObject({ hit: true, stale: true, value: 'v' });
  });
});

describe('createCachedFetcher', () => {
  it('serves last-good value when the fetcher throws', async () => {
    let t = 0;
    const cache = createCache({ now: () => t });
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      if (calls === 1) return 'fresh';
      throw new Error('upstream down');
    };
    const cachedFetch = createCachedFetcher({ cache, fetcher, ttlMs: 100, now: () => t });

    expect(await cachedFetch('k')).toMatchObject({ value: 'fresh', stale: false });
    t = 200; // expire
    const res = await cachedFetch('k');
    expect(res).toMatchObject({ value: 'fresh', stale: true });
    expect(res.error).toBeInstanceOf(Error);
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run server/cache.test.js` — Expected: FAIL.

- [ ] **Step 3: Create `server/cache.js`:**

```js
export function createCache({ now = () => Date.now() } = {}) {
  const store = new Map(); // key -> { value, expiresAt }
  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return { hit: false, stale: false, value: undefined };
      return { hit: true, stale: now() >= entry.expiresAt, value: entry.value };
    },
    set(key, value, ttlMs) {
      store.set(key, { value, expiresAt: now() + ttlMs });
    },
  };
}

export function createCachedFetcher({ cache, fetcher, ttlMs }) {
  return async function cachedFetch(key) {
    const cached = cache.get(key);
    if (cached.hit && !cached.stale) {
      return { value: cached.value, fromCache: true, stale: false };
    }
    try {
      const value = await fetcher(key);
      cache.set(key, value, ttlMs);
      return { value, fromCache: false, stale: false };
    } catch (error) {
      if (cached.hit) {
        return { value: cached.value, fromCache: true, stale: true, error };
      }
      throw error;
    }
  };
}
```

- [ ] **Step 4: Run to verify it passes:** `npx vitest run server/cache.test.js` — Expected: PASS.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(server): ttl cache with last-good fallback"`

### Task 1.4: football-data.org client

**Files:**
- Create: `server/footballDataClient.js`, `server/footballDataClient.test.js`

**Interfaces:**
- Produces: `createFootballDataClient({ apiKey, fetchImpl, baseUrl })` -> `{ getMatches(), getStandings(), getScorers() }`, each resolving to the raw upstream JSON. Sends `X-Auth-Token` when `apiKey` is set. Throws `Error` on non-2xx.

- [ ] **Step 1: Write the failing test** `server/footballDataClient.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createFootballDataClient } from './footballDataClient.js';

function fakeFetch(captured) {
  return async (url, opts) => {
    captured.url = url;
    captured.headers = opts?.headers || {};
    return { ok: true, status: 200, json: async () => ({ matches: [] }) };
  };
}

describe('footballDataClient', () => {
  it('calls the WC matches endpoint with the auth header', async () => {
    const captured = {};
    const client = createFootballDataClient({ apiKey: 'KEY', fetchImpl: fakeFetch(captured) });
    const data = await client.getMatches();
    expect(captured.url).toContain('/competitions/WC/matches');
    expect(captured.headers['X-Auth-Token']).toBe('KEY');
    expect(data).toEqual({ matches: [] });
  });

  it('throws on non-2xx', async () => {
    const client = createFootballDataClient({
      apiKey: 'KEY',
      fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({}) }),
    });
    await expect(client.getMatches()).rejects.toThrow('429');
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run server/footballDataClient.test.js` — Expected: FAIL.

- [ ] **Step 3: Create `server/footballDataClient.js`:**

```js
const DEFAULT_BASE = 'https://api.football-data.org/v4';

export function createFootballDataClient({ apiKey = '', fetchImpl = fetch, baseUrl = DEFAULT_BASE } = {}) {
  async function request(path) {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      headers: apiKey ? { 'X-Auth-Token': apiKey } : {},
    });
    if (!res.ok) {
      throw new Error(`football-data.org ${res.status} for ${path}`);
    }
    return res.json();
  }
  return {
    getMatches: () => request('/competitions/WC/matches'),
    getStandings: () => request('/competitions/WC/standings'),
    getScorers: () => request('/competitions/WC/scorers'),
  };
}
```

- [ ] **Step 4: Run to verify it passes:** `npx vitest run server/footballDataClient.test.js` — Expected: PASS.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(server): football-data.org v4 client"`

### Task 1.5: Normalization

**Files:**
- Create: `server/normalize.js`, `server/normalize.test.js`

**Interfaces:**
- Produces:
  - `normalizeTeam(t)` -> `{ id, name, shortName, tla, crest }` (TBD-safe when `t` is null).
  - `normalizeMatch(m)` -> `{ id, utcDate, status, stage, group, matchday, venue, home, away, score:{home,away,winner} }`.
  - `normalizeStandings(payload)` -> `{ groups: [{ group, table: [{ position, team, played, won, draw, lost, goalsFor, goalsAgainst, goalDifference, points }] }] }`.

- [ ] **Step 1: Write the failing test** `server/normalize.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { normalizeTeam, normalizeMatch, normalizeStandings } from './normalize.js';

describe('normalizeTeam', () => {
  it('returns a TBD team when null', () => {
    expect(normalizeTeam(null)).toMatchObject({ id: null, name: 'TBD' });
  });
});

describe('normalizeMatch', () => {
  it('flattens the upstream match shape', () => {
    const m = normalizeMatch({
      id: 1, utcDate: '2026-06-11T18:00:00Z', status: 'FINISHED',
      stage: 'GROUP_STAGE', group: 'GROUP_A', matchday: 1, venue: 'Estadio Azteca',
      homeTeam: { id: 10, name: 'Mexico', tla: 'MEX', crest: 'mex.png' },
      awayTeam: { id: 20, name: 'Canada', tla: 'CAN', crest: 'can.png' },
      score: { winner: 'HOME_TEAM', fullTime: { home: 2, away: 1 } },
    });
    expect(m).toMatchObject({
      id: 1, group: 'GROUP_A', venue: 'Estadio Azteca',
      home: { name: 'Mexico' }, away: { name: 'Canada' },
      score: { home: 2, away: 1, winner: 'HOME_TEAM' },
    });
  });
});

describe('normalizeStandings', () => {
  it('keeps only TOTAL tables', () => {
    const out = normalizeStandings({
      standings: [
        { type: 'TOTAL', group: 'GROUP_A', table: [{ position: 1, team: { id: 10, name: 'Mexico' }, playedGames: 1, won: 1, draw: 0, lost: 0, goalsFor: 2, goalsAgainst: 1, goalDifference: 1, points: 3 }] },
        { type: 'HOME', group: 'GROUP_A', table: [] },
      ],
    });
    expect(out.groups).toHaveLength(1);
    expect(out.groups[0].table[0]).toMatchObject({ played: 1, points: 3, goalDifference: 1 });
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run server/normalize.test.js` — Expected: FAIL.

- [ ] **Step 3: Create `server/normalize.js`:**

```js
export function normalizeTeam(t) {
  if (!t) return { id: null, name: 'TBD', shortName: 'TBD', tla: null, crest: null };
  return {
    id: t.id ?? null,
    name: t.name ?? 'TBD',
    shortName: t.shortName ?? t.name ?? 'TBD',
    tla: t.tla ?? null,
    crest: t.crest ?? null,
  };
}

export function normalizeMatch(m) {
  return {
    id: m.id,
    utcDate: m.utcDate,
    status: m.status,
    stage: m.stage,
    group: m.group ?? null,
    matchday: m.matchday ?? null,
    venue: m.venue ?? null,
    home: normalizeTeam(m.homeTeam),
    away: normalizeTeam(m.awayTeam),
    score: {
      home: m.score?.fullTime?.home ?? null,
      away: m.score?.fullTime?.away ?? null,
      winner: m.score?.winner ?? null,
    },
  };
}

export function normalizeStandings(payload) {
  const groups = (payload.standings ?? [])
    .filter((s) => s.type === 'TOTAL')
    .map((s) => ({
      group: s.group,
      table: (s.table ?? []).map((row) => ({
        position: row.position,
        team: normalizeTeam(row.team),
        played: row.playedGames,
        won: row.won,
        draw: row.draw,
        lost: row.lost,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDifference: row.goalDifference,
        points: row.points,
      })),
    }));
  return { groups };
}
```

- [ ] **Step 4: Run to verify it passes:** `npx vitest run server/normalize.test.js` — Expected: PASS.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(server): normalize upstream shapes"`

### Task 1.6: Advancement + tiebreaker logic (high-value)

This is the newcomer-facing core. The model is **points-based** for clinch/eliminate decisions and uses points → goal difference → goals for ordering. Head-to-head and fair-play tiebreakers are **intentionally not modeled** (documented limitation); ordering ties beyond goals-for are left in input order.

**Files:**
- Create: `server/standings.js`, `server/standings.test.js`

**Interfaces:**
- Produces:
  - `compareRows(a, b)` — sort comparator (negative if `a` ranks ahead). Order: points, goalDifference, goalsFor.
  - `rankGroup(table)` -> rows sorted, each given `rank` (1-based).
  - `advancementStatus(rankedTable)` -> same rows, each with `status` ∈ `'through'|'alive'|'out'` and a plain-English `note`. Rules: a group team is `through` if at most 1 other team can still finish above it on points; `out` if at least 2 others already exceed its max reachable points; else `alive`. Max reachable points = `points + 3*(3 - played)`.
  - `bestThirds(rankedGroups)` -> array of the 8 best 3rd-place `team.id`s (only meaningful once groups are complete; ranks all rank-3 rows via `compareRows`).

- [ ] **Step 1: Write the failing test** `server/standings.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { compareRows, rankGroup, advancementStatus, bestThirds } from './standings.js';

const row = (over) => ({ team: { id: over.id }, played: 3, won: 0, draw: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, ...over });

describe('compareRows / rankGroup', () => {
  it('orders by points then GD then GF', () => {
    const ranked = rankGroup([
      row({ id: 'a', points: 6, goalDifference: 1, goalsFor: 3 }),
      row({ id: 'b', points: 6, goalDifference: 3, goalsFor: 5 }),
      row({ id: 'c', points: 3, goalDifference: 0, goalsFor: 2 }),
    ]);
    expect(ranked.map((r) => r.team.id)).toEqual(['b', 'a', 'c']);
    expect(ranked[0].rank).toBe(1);
  });
});

describe('advancementStatus (completed group)', () => {
  it('top two are through, bottom two are out', () => {
    const ranked = rankGroup([
      row({ id: 'a', points: 9 }), row({ id: 'b', points: 6 }),
      row({ id: 'c', points: 3 }), row({ id: 'd', points: 0 }),
    ]);
    const out = advancementStatus(ranked);
    expect(out.find((r) => r.team.id === 'a').status).toBe('through');
    expect(out.find((r) => r.team.id === 'b').status).toBe('through');
    expect(out.find((r) => r.team.id === 'd').status).toBe('out');
  });
});

describe('advancementStatus (mid-group)', () => {
  it('marks a team eliminated when two others are already out of reach', () => {
    // played 2 of 3 -> max reachable = points + 3
    const ranked = rankGroup([
      row({ id: 'a', played: 2, points: 6 }),
      row({ id: 'b', played: 2, points: 6 }),
      row({ id: 'c', played: 2, points: 1 }),
      row({ id: 'd', played: 2, points: 1 }),
    ]);
    const out = advancementStatus(ranked);
    // c/d max reachable = 4; a and b already have 6 > 4 -> out
    expect(out.find((r) => r.team.id === 'c').status).toBe('out');
  });
});

describe('bestThirds', () => {
  it('returns the best 8 third-place team ids', () => {
    const groups = Array.from({ length: 12 }, (_, g) =>
      rankGroup([
        row({ id: `${g}-1`, points: 9 }), row({ id: `${g}-2`, points: 6 }),
        row({ id: `${g}-3`, points: g, goalsFor: g }), row({ id: `${g}-4`, points: 0 }),
      ]),
    );
    const ids = bestThirds(groups);
    expect(ids).toHaveLength(8);
    expect(ids).toContain('11-3'); // highest-points third place
    expect(ids).not.toContain('0-3'); // lowest-points third place
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run server/standings.test.js` — Expected: FAIL.

- [ ] **Step 3: Create `server/standings.js`:**

```js
const TOTAL_MATCHDAYS = 3;

export function compareRows(a, b) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return 0; // head-to-head / fair-play not modeled
}

export function rankGroup(table) {
  return [...table]
    .sort(compareRows)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

function maxReachable(row) {
  return row.points + 3 * Math.max(0, TOTAL_MATCHDAYS - row.played);
}

export function advancementStatus(rankedTable) {
  return rankedTable.map((row) => {
    const others = rankedTable.filter((r) => r !== row);
    const canFinishAbove = others.filter((o) => maxReachable(o) > row.points).length;
    const alreadyAbove = others.filter((o) => o.points > maxReachable(row)).length;

    let status;
    let note;
    if (canFinishAbove <= 1) {
      status = 'through';
      note = row.played >= TOTAL_MATCHDAYS
        ? 'Through to the knockout rounds 🎉'
        : 'Already qualified for the knockouts';
    } else if (alreadyAbove >= 2) {
      status = 'out';
      note = "Eliminated — can't reach the top two";
    } else {
      status = 'alive';
      note = 'Still alive — needs the right results to advance';
    }
    return { ...row, status, note };
  });
}

export function bestThirds(rankedGroups) {
  const thirds = rankedGroups
    .map((g) => g.find((r) => r.rank === 3))
    .filter(Boolean);
  return thirds
    .sort(compareRows)
    .slice(0, 8)
    .map((r) => r.team.id);
}
```

- [ ] **Step 4: Run to verify it passes:** `npx vitest run server/standings.test.js` — Expected: PASS.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(server): group advancement + tiebreaker logic"`

### Task 1.7: Snapshot fallback data

**Files:**
- Create: `server/data/snapshot.json`

**Interfaces:**
- Produces: a committed JSON `{ matches: { matches: [...] }, standings: { standings: [...] } }` holding **raw upstream-shaped** sample data for at least two groups and a few matches (scheduled + finished). Used by `dataService` when there is no API key and by integration tests.

- [ ] **Step 1: Create `server/data/snapshot.json`** with raw-shaped sample data (two groups, four matches — one FINISHED, one IN_PLAY, two SCHEDULED). Keep team ids stable so other tests can reference them:

```json
{
  "matches": {
    "matches": [
      { "id": 1, "utcDate": "2026-06-11T18:00:00Z", "status": "FINISHED", "stage": "GROUP_STAGE", "group": "GROUP_A", "matchday": 1, "venue": "Estadio Azteca",
        "homeTeam": { "id": 10, "name": "Mexico", "tla": "MEX", "crest": "" },
        "awayTeam": { "id": 11, "name": "Canada", "tla": "CAN", "crest": "" },
        "score": { "winner": "HOME_TEAM", "fullTime": { "home": 2, "away": 1 } } },
      { "id": 2, "utcDate": "2026-06-11T21:00:00Z", "status": "IN_PLAY", "stage": "GROUP_STAGE", "group": "GROUP_A", "matchday": 1, "venue": "SoFi Stadium",
        "homeTeam": { "id": 12, "name": "USA", "tla": "USA", "crest": "" },
        "awayTeam": { "id": 13, "name": "Wales", "tla": "WAL", "crest": "" },
        "score": { "winner": null, "fullTime": { "home": 0, "away": 0 } } },
      { "id": 3, "utcDate": "2026-06-15T18:00:00Z", "status": "SCHEDULED", "stage": "GROUP_STAGE", "group": "GROUP_A", "matchday": 2, "venue": "Estadio Akron",
        "homeTeam": { "id": 10, "name": "Mexico", "tla": "MEX", "crest": "" },
        "awayTeam": { "id": 12, "name": "USA", "tla": "USA", "crest": "" },
        "score": { "winner": null, "fullTime": { "home": null, "away": null } } },
      { "id": 4, "utcDate": "2026-06-12T18:00:00Z", "status": "SCHEDULED", "stage": "GROUP_STAGE", "group": "GROUP_B", "matchday": 1, "venue": "MetLife Stadium",
        "homeTeam": { "id": 20, "name": "Brazil", "tla": "BRA", "crest": "" },
        "awayTeam": { "id": 21, "name": "Japan", "tla": "JPN", "crest": "" },
        "score": { "winner": null, "fullTime": { "home": null, "away": null } } }
    ]
  },
  "standings": {
    "standings": [
      { "type": "TOTAL", "group": "GROUP_A", "table": [
        { "position": 1, "team": { "id": 10, "name": "Mexico", "tla": "MEX", "crest": "" }, "playedGames": 1, "won": 1, "draw": 0, "lost": 0, "goalsFor": 2, "goalsAgainst": 1, "goalDifference": 1, "points": 3 },
        { "position": 2, "team": { "id": 12, "name": "USA", "tla": "USA", "crest": "" }, "playedGames": 0, "won": 0, "draw": 0, "lost": 0, "goalsFor": 0, "goalsAgainst": 0, "goalDifference": 0, "points": 0 },
        { "position": 3, "team": { "id": 13, "name": "Wales", "tla": "WAL", "crest": "" }, "playedGames": 0, "won": 0, "draw": 0, "lost": 0, "goalsFor": 0, "goalsAgainst": 0, "goalDifference": 0, "points": 0 },
        { "position": 4, "team": { "id": 11, "name": "Canada", "tla": "CAN", "crest": "" }, "playedGames": 1, "won": 0, "draw": 0, "lost": 1, "goalsFor": 1, "goalsAgainst": 2, "goalDifference": -1, "points": 0 }
      ] }
    ]
  }
}
```

- [ ] **Step 2: Commit:** `git add -A && git commit -m "feat(data): committed snapshot fallback"`

### Task 1.8: dataService — orchestration

**Files:**
- Create: `server/dataService.js`, `server/dataService.test.js`

**Interfaces:**
- Consumes: `createCache`, `createCachedFetcher` (1.3), `createFootballDataClient` (1.4), `normalizeMatch`/`normalizeStandings` (1.5), `rankGroup`/`advancementStatus`/`bestThirds` (1.6), `HOST_CITIES`/`getHostCity` (1.1), snapshot (1.7).
- Produces: `createDataService({ config, fetchImpl, now })` -> `{ getMatches(), getStandings(), getScorers() }`.
  - `getMatches()` -> `{ updatedAt, stale, matches: NormalizedMatch[] }` (each match gets a `city` field resolved from `venue` against `HOST_CITIES`, or `null`).
  - `getStandings()` -> `{ updatedAt, stale, groups: [{ group, table: RowWithStatus[] }], bestThirdIds: string[] }`.
  - When `config.apiKey` is empty, all reads come from the snapshot and `stale` is `true` with `updatedAt: null`.

- [ ] **Step 1: Write the failing test** `server/dataService.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createDataService } from './dataService.js';

describe('dataService (snapshot mode, no api key)', () => {
  const svc = createDataService({ config: { apiKey: '', ttls: { matches: 1, standings: 1, scorers: 1 } } });

  it('serves normalized matches with city resolved from venue', async () => {
    const { matches, stale } = await svc.getMatches();
    expect(stale).toBe(true);
    const m1 = matches.find((m) => m.id === 1);
    expect(m1.home.name).toBe('Mexico');
    expect(m1.city?.id).toBe('mexico-city'); // venue "Estadio Azteca" -> city
  });

  it('serves standings with advancement status + bestThirdIds', async () => {
    const { groups, bestThirdIds } = await svc.getStandings();
    const groupA = groups.find((g) => g.group === 'GROUP_A');
    expect(groupA.table[0]).toHaveProperty('status');
    expect(Array.isArray(bestThirdIds)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run server/dataService.test.js` — Expected: FAIL.

- [ ] **Step 3: Create `server/dataService.js`:**

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCache, createCachedFetcher } from './cache.js';
import { createFootballDataClient } from './footballDataClient.js';
import { normalizeMatch, normalizeStandings } from './normalize.js';
import { rankGroup, advancementStatus, bestThirds } from './standings.js';
import { HOST_CITIES } from './data/hostCities.js';

const SNAPSHOT = JSON.parse(
  readFileSync(fileURLToPath(new URL('./data/snapshot.json', import.meta.url)), 'utf8'),
);

function resolveCity(venue) {
  if (!venue) return null;
  return HOST_CITIES.find((c) => c.stadium === venue) ?? null;
}

export function createDataService({ config, fetchImpl = fetch, now = () => Date.now() }) {
  const useApi = Boolean(config.apiKey);
  const cache = createCache({ now });
  const client = createFootballDataClient({ apiKey: config.apiKey, fetchImpl });

  const fetchMatches = createCachedFetcher({
    cache, ttlMs: config.ttls.matches,
    fetcher: () => client.getMatches(),
  });
  const fetchStandings = createCachedFetcher({
    cache, ttlMs: config.ttls.standings,
    fetcher: () => client.getStandings(),
  });
  const fetchScorers = createCachedFetcher({
    cache, ttlMs: config.ttls.scorers,
    fetcher: () => client.getScorers(),
  });

  async function load(key, fetchFn, snapshotValue) {
    if (!useApi) return { value: snapshotValue, stale: true, updatedAt: null };
    try {
      const r = await fetchFn(key);
      return { value: r.value, stale: Boolean(r.stale), updatedAt: now() };
    } catch {
      return { value: snapshotValue, stale: true, updatedAt: null };
    }
  }

  return {
    async getMatches() {
      const { value, stale, updatedAt } = await load('matches', fetchMatches, SNAPSHOT.matches);
      const matches = (value.matches ?? [])
        .map(normalizeMatch)
        .map((m) => ({ ...m, city: resolveCity(m.venue) }));
      return { updatedAt, stale, matches };
    },

    async getStandings() {
      const { value, stale, updatedAt } = await load('standings', fetchStandings, SNAPSHOT.standings);
      const norm = normalizeStandings(value);
      const ranked = norm.groups.map((g) => ({ group: g.group, table: rankGroup(g.table) }));
      const groups = ranked.map((g) => ({ group: g.group, table: advancementStatus(g.table) }));
      const bestThirdIds = bestThirds(ranked.map((g) => g.table));
      return { updatedAt, stale, groups, bestThirdIds };
    },

    async getScorers() {
      const { value, stale, updatedAt } = await load('scorers', fetchScorers, { scorers: [] });
      return { updatedAt, stale, scorers: value.scorers ?? [] };
    },
  };
}
```

- [ ] **Step 4: Run to verify it passes:** `npx vitest run server/dataService.test.js` — Expected: PASS.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(server): data service orchestration with snapshot fallback"`

### Task 1.9: API routes

**Files:**
- Create: `server/routes.js`, `server/routes.test.js`
- Modify: `server/index.js` (mount router; construct dataService on boot)

**Interfaces:**
- Consumes: `createDataService` (1.8), `loadConfig` (0.2).
- Produces: `buildRouter(dataService)` -> Express Router with `GET /matches`, `GET /standings`, `GET /scorers`, each returning the service payload as JSON. Mounted at `/api`.

- [ ] **Step 1: Write the failing test** `server/routes.test.js`:

```js
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
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run server/routes.test.js` — Expected: FAIL.

- [ ] **Step 3: Create `server/routes.js`:**

```js
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
```

- [ ] **Step 4: Modify `server/index.js`** to mount the router and build the service. Replace the file body with:

```js
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
```

- [ ] **Step 5: Run to verify it passes:** `npx vitest run server/routes.test.js server/index.test.js` — Expected: PASS (both files).

- [ ] **Step 6: Manual check:** `node server/index.js`, then in another shell `curl localhost:3000/api/matches` → JSON with `matches`. Stop the server.

- [ ] **Step 7: Commit:** `git add -A && git commit -m "feat(server): mount /api routes with snapshot-backed service"`

---

## Phase 2 — Panini Design System + Shell

### Task 2.1: Design tokens

**Files:**
- Create: `src/theme/tokens.css`
- Modify: `src/theme/global.css` (import tokens; base styles)

**Interfaces:**
- Produces: CSS custom properties under `:root` — colors (`--paper`, `--ink`, `--gold`, `--through`, `--alive`, `--out`, group accent), radii (`--sticker-radius`), and a paper texture treatment. No test (pure CSS); verified visually in later tasks.

- [ ] **Step 1: Create `src/theme/tokens.css`:**

```css
:root {
  /* Panini paper + ink */
  --paper: #f4ecd8;
  --paper-edge: #e7dcc0;
  --ink: #1d2330;
  --muted: #6b6151;

  /* Foil / accent */
  --gold: #d8b24a;
  --gold-sheen: #f3e3a8;

  /* Advancement semantics */
  --through: #2e8b57;
  --alive: #c8951d;
  --out: #b23b3b;

  /* Shape */
  --sticker-radius: 14px;
  --sticker-shadow: 0 2px 0 var(--paper-edge), 0 6px 14px rgba(0,0,0,0.18);
  --foil-sheen: linear-gradient(135deg, var(--gold-sheen), var(--gold));
}
```

- [ ] **Step 2: Replace `src/theme/global.css`:**

```css
@import './tokens.css';

* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: "Arial Narrow", system-ui, sans-serif;
}
h1, h2, h3 { letter-spacing: 0.02em; text-transform: uppercase; }
```

- [ ] **Step 3: Commit:** `git add -A && git commit -m "feat(theme): panini design tokens"`

### Task 2.2: StickerCard

**Files:**
- Create: `src/components/StickerCard.jsx`, `src/components/StickerCard.css`, `src/components/StickerCard.test.jsx`

**Interfaces:**
- Produces: `<StickerCard accent? foil? className?>{children}</StickerCard>` — a rounded card with sticker shadow. `foil` adds the foil sheen edge; `accent` sets a CSS var `--accent` for the left edge.

- [ ] **Step 1: Write the failing test** `src/components/StickerCard.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StickerCard from './StickerCard.jsx';

describe('StickerCard', () => {
  it('renders children and the foil modifier when set', () => {
    render(<StickerCard foil>Hello</StickerCard>);
    const card = screen.getByText('Hello');
    expect(card).toHaveClass('sticker--foil');
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/components/StickerCard.test.jsx` — Expected: FAIL.

- [ ] **Step 3: Create `src/components/StickerCard.css`:**

```css
.sticker {
  background: var(--paper);
  border-radius: var(--sticker-radius);
  box-shadow: var(--sticker-shadow);
  border: 2px solid var(--paper-edge);
  padding: 12px;
  position: relative;
}
.sticker--accent { border-left: 6px solid var(--accent, var(--gold)); }
.sticker--foil::before {
  content: ""; position: absolute; inset: 0;
  border-radius: var(--sticker-radius);
  padding: 2px; background: var(--foil-sheen);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none;
}
```

- [ ] **Step 4: Create `src/components/StickerCard.jsx`:**

```jsx
import './StickerCard.css';

export default function StickerCard({ children, accent, foil = false, className = '', style }) {
  const classes = ['sticker', accent && 'sticker--accent', foil && 'sticker--foil', className]
    .filter(Boolean)
    .join(' ');
  const mergedStyle = accent ? { ...style, '--accent': accent } : style;
  return (
    <div className={classes} style={mergedStyle}>
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Run to verify it passes:** `npx vitest run src/components/StickerCard.test.jsx` — Expected: PASS.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat(ui): StickerCard component"`

### Task 2.3: TeamSticker

**Files:**
- Create: `src/components/TeamSticker.jsx`, `src/components/TeamSticker.css`, `src/components/TeamSticker.test.jsx`

**Interfaces:**
- Consumes: a normalized team `{ name, shortName, tla, crest }`.
- Produces: `<TeamSticker team align? />` — shows the crest (or a flag-circle fallback with the TLA) and the team name. Renders `TBD` safely when `team.name` is `'TBD'`.

- [ ] **Step 1: Write the failing test** `src/components/TeamSticker.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamSticker from './TeamSticker.jsx';

describe('TeamSticker', () => {
  it('shows the team name and TLA fallback when no crest', () => {
    render(<TeamSticker team={{ name: 'Mexico', shortName: 'Mexico', tla: 'MEX', crest: null }} />);
    expect(screen.getByText('Mexico')).toBeInTheDocument();
    expect(screen.getByText('MEX')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/components/TeamSticker.test.jsx` — Expected: FAIL.

- [ ] **Step 3: Create `src/components/TeamSticker.css`:**

```css
.team { display: inline-flex; align-items: center; gap: 8px; }
.team--right { flex-direction: row-reverse; }
.team__badge {
  width: 34px; height: 34px; border-radius: 50%;
  display: grid; place-items: center;
  background: var(--paper-edge); color: var(--ink);
  font-size: 11px; font-weight: 700; overflow: hidden;
}
.team__badge img { width: 100%; height: 100%; object-fit: cover; }
.team__name { font-weight: 700; }
```

- [ ] **Step 4: Create `src/components/TeamSticker.jsx`:**

```jsx
import './TeamSticker.css';

export default function TeamSticker({ team, align = 'left' }) {
  const cls = `team ${align === 'right' ? 'team--right' : ''}`.trim();
  return (
    <span className={cls}>
      <span className="team__badge">
        {team.crest ? <img src={team.crest} alt="" /> : (team.tla ?? '??')}
      </span>
      <span className="team__name">{team.name}</span>
    </span>
  );
}
```

- [ ] **Step 5: Run to verify it passes:** `npx vitest run src/components/TeamSticker.test.jsx` — Expected: PASS.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat(ui): TeamSticker component"`

### Task 2.4: MatchSticker (upcoming / in-progress / final)

**Files:**
- Create: `src/components/MatchSticker.jsx`, `src/components/MatchSticker.css`, `src/components/MatchSticker.test.jsx`

**Interfaces:**
- Consumes: a normalized match (from `/api/matches`).
- Produces: `<MatchSticker match />`. Shows both `TeamSticker`s. Renders the **score** when `status` is `FINISHED`/`IN_PLAY`/`PAUSED`; renders the **kickoff time** (from `utcDate`) when `SCHEDULED`/`TIMED`. Shows a `LIVE` chip when `IN_PLAY`/`PAUSED`. Shows the city name when present.

- [ ] **Step 1: Write the failing test** `src/components/MatchSticker.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MatchSticker from './MatchSticker.jsx';

const base = {
  home: { name: 'Mexico', tla: 'MEX' }, away: { name: 'Canada', tla: 'CAN' },
  city: { city: 'Mexico City' },
};

describe('MatchSticker', () => {
  it('shows the score and LIVE chip when in play', () => {
    render(<MatchSticker match={{ ...base, status: 'IN_PLAY', score: { home: 1, away: 0 } }} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('shows kickoff time when scheduled', () => {
    render(<MatchSticker match={{ ...base, status: 'SCHEDULED', utcDate: '2026-06-15T18:00:00Z', score: { home: null, away: null } }} />);
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
    expect(screen.getByTestId('kickoff')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/components/MatchSticker.test.jsx` — Expected: FAIL.

- [ ] **Step 3: Create `src/components/MatchSticker.css`:**

```css
.match { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; }
.match__mid { text-align: center; min-width: 64px; }
.match__score { font-size: 22px; font-weight: 800; }
.match__time { font-size: 13px; color: var(--muted); }
.match__live { display: inline-block; margin-top: 2px; font-size: 10px; font-weight: 800; color: #fff; background: var(--out); padding: 1px 6px; border-radius: 8px; }
.match__city { margin-top: 8px; text-align: center; font-size: 11px; color: var(--muted); }
```

- [ ] **Step 4: Create `src/components/MatchSticker.jsx`:**

```jsx
import StickerCard from './StickerCard.jsx';
import TeamSticker from './TeamSticker.jsx';
import './MatchSticker.css';

const LIVE = new Set(['IN_PLAY', 'PAUSED']);
const PLAYED = new Set(['IN_PLAY', 'PAUSED', 'FINISHED']);

function kickoff(utcDate) {
  if (!utcDate) return '';
  return new Date(utcDate).toLocaleString(undefined, {
    weekday: 'short', hour: 'numeric', minute: '2-digit',
  });
}

export default function MatchSticker({ match }) {
  const isLive = LIVE.has(match.status);
  const showScore = PLAYED.has(match.status);
  return (
    <StickerCard foil={isLive}>
      <div className="match">
        <TeamSticker team={match.home} />
        <div className="match__mid">
          {showScore ? (
            <div className="match__score">
              <span>{match.score.home ?? 0}</span> – <span>{match.score.away ?? 0}</span>
            </div>
          ) : (
            <div className="match__time" data-testid="kickoff">{kickoff(match.utcDate)}</div>
          )}
          {isLive && <span className="match__live">LIVE</span>}
        </div>
        <TeamSticker team={match.away} align="right" />
      </div>
      {match.city && <div className="match__city">{match.city.city}</div>}
    </StickerCard>
  );
}
```

- [ ] **Step 5: Run to verify it passes:** `npx vitest run src/components/MatchSticker.test.jsx` — Expected: PASS.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat(ui): MatchSticker with upcoming/live/final states"`

### Task 2.5: AdvancementBadge

**Files:**
- Create: `src/components/AdvancementBadge.jsx`, `src/components/AdvancementBadge.css`, `src/components/AdvancementBadge.test.jsx`

**Interfaces:**
- Consumes: `status` ∈ `'through'|'alive'|'out'`.
- Produces: `<AdvancementBadge status />` — a colored chip with label `Through ✅` / `Alive ⚠️` / `Out ❌` and the matching semantic color.

- [ ] **Step 1: Write the failing test** `src/components/AdvancementBadge.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdvancementBadge from './AdvancementBadge.jsx';

describe('AdvancementBadge', () => {
  it('labels each status', () => {
    const { rerender } = render(<AdvancementBadge status="through" />);
    expect(screen.getByText(/Through/)).toBeInTheDocument();
    rerender(<AdvancementBadge status="out" />);
    expect(screen.getByText(/Out/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/components/AdvancementBadge.test.jsx` — Expected: FAIL.

- [ ] **Step 3: Create `src/components/AdvancementBadge.css`:**

```css
.adv { font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 9px; color: #fff; white-space: nowrap; }
.adv--through { background: var(--through); }
.adv--alive { background: var(--alive); }
.adv--out { background: var(--out); }
```

- [ ] **Step 4: Create `src/components/AdvancementBadge.jsx`:**

```jsx
import './AdvancementBadge.css';

const LABELS = { through: 'Through ✅', alive: 'Alive ⚠️', out: 'Out ❌' };

export default function AdvancementBadge({ status }) {
  return <span className={`adv adv--${status}`}>{LABELS[status] ?? status}</span>;
}
```

- [ ] **Step 5: Run to verify it passes:** `npx vitest run src/components/AdvancementBadge.test.jsx` — Expected: PASS.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat(ui): AdvancementBadge component"`

### Task 2.6: Term (glossary tooltip primitive)

**Files:**
- Create: `src/components/Term.jsx`, `src/components/Term.css`, `src/components/Term.test.jsx`

**Interfaces:**
- Produces: `<Term define="...">word</Term>` — renders the word with a dotted underline and exposes the definition via `title` + an accessible `aria-label`, so jargon always has a plain-English explanation one hover/tap away. (Plan 2 builds the full glossary that feeds `define`.)

- [ ] **Step 1: Write the failing test** `src/components/Term.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Term from './Term.jsx';

describe('Term', () => {
  it('exposes the definition accessibly', () => {
    render(<Term define="Top two of each group advance.">group stage</Term>);
    const el = screen.getByText('group stage');
    expect(el).toHaveAttribute('title', 'Top two of each group advance.');
    expect(el).toHaveAttribute('aria-label', expect.stringContaining('group stage'));
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/components/Term.test.jsx` — Expected: FAIL.

- [ ] **Step 3: Create `src/components/Term.css`:**

```css
.term { border-bottom: 1px dotted var(--muted); cursor: help; }
```

- [ ] **Step 4: Create `src/components/Term.jsx`:**

```jsx
import './Term.css';

export default function Term({ define, children }) {
  return (
    <span className="term" title={define} aria-label={`${children}: ${define}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 5: Run to verify it passes:** `npx vitest run src/components/Term.test.jsx` — Expected: PASS.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat(ui): Term glossary tooltip primitive"`

### Task 2.7: Frontend API client + app shell with nav

**Files:**
- Create: `src/api/client.js`, `src/api/client.test.js`
- Modify: `src/App.jsx`, `src/theme/global.css` (nav styles)

**Interfaces:**
- Produces:
  - `getMatches()`, `getStandings()`, `getScorers()` in `src/api/client.js` — `fetch('/api/...')`, returning parsed JSON; throw on non-ok.
  - `<App />` renders a header with the brand and a nav with four buttons: **Today**, **Timeline**, **Map**, **Standings**, switching a `view` state. Each view renders a placeholder `<section aria-label="...">` for now (Plan 2 fills them).

- [ ] **Step 1: Write the failing test** `src/api/client.test.js`:

```js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getMatches } from './client.js';

afterEach(() => vi.restoreAllMocks());

describe('api client', () => {
  it('fetches /api/matches and returns json', async () => {
    vi.stubGlobal('fetch', async (url) => ({
      ok: true, json: async () => ({ url, matches: [] }),
    }));
    const data = await getMatches();
    expect(data.url).toBe('/api/matches');
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/api/client.test.js` — Expected: FAIL.

- [ ] **Step 3: Create `src/api/client.js`:**

```js
async function getJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}
export const getMatches = () => getJson('/api/matches');
export const getStandings = () => getJson('/api/standings');
export const getScorers = () => getJson('/api/scorers');
```

- [ ] **Step 4: Write the failing test for nav** — append to `src/App.test.jsx`:

```jsx
import { fireEvent } from '@testing-library/react';

it('switches views via nav', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Standings' }));
  expect(screen.getByRole('region', { name: /standings/i })).toBeInTheDocument();
});
```

- [ ] **Step 5: Run to verify it fails:** `npx vitest run src/App.test.jsx` — Expected: FAIL (no nav yet).

- [ ] **Step 6: Replace `src/App.jsx`:**

```jsx
import { useState } from 'react';
import './theme/global.css';

const VIEWS = [
  { key: 'today', label: 'Today' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'map', label: 'Map' },
  { key: 'standings', label: 'Standings' },
];

export default function App() {
  const [view, setView] = useState('today');
  return (
    <div className="app">
      <header className="app__header">
        <h1>Mundial26</h1>
        <nav className="app__nav">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              className={`app__nav-btn ${view === v.key ? 'is-active' : ''}`}
              onClick={() => setView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app__main">
        {view === 'today' && <section aria-label="Today">Today (coming in Plan 2)</section>}
        {view === 'timeline' && <section aria-label="Timeline">Timeline (coming in Plan 2)</section>}
        {view === 'map' && <section aria-label="Map">Map (coming in Plan 2)</section>}
        {view === 'standings' && <section aria-label="Standings">Standings (coming in Plan 2)</section>}
      </main>
    </div>
  );
}
```

- [ ] **Step 7: Append nav styles to `src/theme/global.css`:**

```css
.app__header { padding: 16px 20px; background: var(--ink); color: var(--paper); }
.app__header h1 { margin: 0 0 8px; color: var(--gold); }
.app__nav { display: flex; gap: 8px; flex-wrap: wrap; }
.app__nav-btn { border: 0; border-radius: 10px; padding: 8px 14px; font-weight: 800; cursor: pointer; background: var(--paper-edge); color: var(--ink); }
.app__nav-btn.is-active { background: var(--gold); }
.app__main { padding: 20px; max-width: 1100px; margin: 0 auto; }
```

- [ ] **Step 8: Run to verify it passes:** `npx vitest run src/App.test.jsx src/api/client.test.js` — Expected: PASS.

- [ ] **Step 9: Commit:** `git add -A && git commit -m "feat(web): api client + app shell with view nav"`

### Task 2.8: End-to-end smoke — Today renders real matches

**Files:**
- Create: `src/views/TodayView.jsx`, `src/views/TodayView.test.jsx`
- Modify: `src/App.jsx` (use `TodayView`)

**Interfaces:**
- Consumes: `getMatches` (2.7), `MatchSticker` (2.4).
- Produces: `<TodayView />` — fetches matches on mount, renders each as a `MatchSticker` in a list, shows a loading state first. This is the minimal end-to-end proof (Plan 2 turns it into the full "Today" dashboard with what-to-watch/strips).

- [ ] **Step 1: Write the failing test** `src/views/TodayView.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TodayView from './TodayView.jsx';

afterEach(() => vi.restoreAllMocks());

describe('TodayView', () => {
  it('renders matches from the api', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({ matches: [
        { id: 1, status: 'FINISHED', score: { home: 2, away: 1 },
          home: { name: 'Mexico', tla: 'MEX' }, away: { name: 'Canada', tla: 'CAN' }, city: null },
      ] }),
    }));
    render(<TodayView />);
    await waitFor(() => expect(screen.getByText('Mexico')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/views/TodayView.test.jsx` — Expected: FAIL.

- [ ] **Step 3: Create `src/views/TodayView.jsx`:**

```jsx
import { useEffect, useState } from 'react';
import { getMatches } from '../api/client.js';
import MatchSticker from '../components/MatchSticker.jsx';

export default function TodayView() {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getMatches()
      .then((data) => active && setMatches(data.matches))
      .catch((e) => active && setError(e.message));
    return () => { active = false; };
  }, []);

  if (error) return <section aria-label="Today">Couldn’t load matches.</section>;
  if (!matches) return <section aria-label="Today">Loading…</section>;
  return (
    <section aria-label="Today" style={{ display: 'grid', gap: 12 }}>
      {matches.map((m) => <MatchSticker key={m.id} match={m} />)}
    </section>
  );
}
```

- [ ] **Step 4: Modify `src/App.jsx`** — import and use `TodayView`:
  - Add `import TodayView from './views/TodayView.jsx';` at the top.
  - Replace the `today` line with: `{view === 'today' && <TodayView />}`

- [ ] **Step 5: Run to verify it passes:** `npx vitest run src/views/TodayView.test.jsx src/App.test.jsx` — Expected: PASS.

- [ ] **Step 6: Full suite:** `npm test` — Expected: all green.

- [ ] **Step 7: Manual check:** `npm run dev`, open the app, confirm snapshot matches render as stickers under "Today". Stop dev.

- [ ] **Step 8: Commit:** `git add -A && git commit -m "feat(web): TodayView renders real matches end-to-end"`

---

## Phase 3 — Deploy to Render

### Task 3.1: Render config + deploy

**Files:**
- Create: `render.yaml`
- Modify: `README.md` (deploy + local-run notes)

**Interfaces:**
- Produces: a Render Blueprint that builds the SPA and runs Express; documents the `FOOTBALL_DATA_API_KEY` env var.

- [ ] **Step 1: Create `render.yaml`:**

```yaml
services:
  - type: web
    name: mundial26
    runtime: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: FOOTBALL_DATA_API_KEY
        sync: false
      - key: NODE_ENV
        value: production
```

- [ ] **Step 2: Add a "Run & Deploy" section to `README.md`:**

```markdown
## Run locally
1. `cp .env.example .env` and (optionally) add `FOOTBALL_DATA_API_KEY`. Without a key the app serves bundled snapshot data.
2. `npm install`
3. `npm run dev` — Vite on its dev port, Express API on :3000 (proxied).

## Deploy (Render)
- Push to GitHub, create a Render **Blueprint** from `render.yaml`.
- Set `FOOTBALL_DATA_API_KEY` in the Render dashboard (Environment).
- Render runs `npm install && npm run build`, then `npm start` (Express serves `dist/` + `/api`).
```

- [ ] **Step 3: Production smoke test locally:**

```bash
npm run build
NODE_ENV=production npm start &
sleep 1
curl -s localhost:3000/api/health   # {"ok":true}
curl -s localhost:3000/ | grep -q "root" && echo "SPA served"
kill %1
```
Expected: health JSON + "SPA served".

- [ ] **Step 4: Commit + push:**

```bash
git add -A && git commit -m "chore: render blueprint + run/deploy docs"
git push origin main
```

- [ ] **Step 5: Deploy (manual, in Render dashboard):** create the Blueprint from the repo, set the env var, trigger the deploy, confirm the public URL loads the app with snapshot or live data.

---

## Self-Review

**1. Spec coverage (foundation scope):**
- Data source / football-data.org client → Task 1.4 ✅
- Caching + last-good fallback (no live tick) → Task 1.3, 1.8 ✅
- API key server-only → `config.js` (0.2), client header (1.4), `.env.example` (0.1), `render.yaml` `sync:false` (3.1) ✅
- Bundled static reference data (cities, groups) → 1.1, 1.2 ✅
- 48-team format advancement + tiebreakers → 1.6 ✅
- Snapshot fallback (offline/tests) → 1.7, 1.8 ✅
- Single Render service serving SPA + /api → 1.9 (`createApp` prod static), 3.1 ✅
- Panini design system primitives → 2.1–2.6 ✅
- App shell + four-view nav → 2.7 ✅
- Newcomer `Term` primitive (full glossary in Plan 2) → 2.6 ✅
- Error handling (502 + snapshot + loading/empty states) → 1.9, 1.8, 2.8 ✅
- *Deferred to Plan 2 (Experience):* the four full views, advancement-cue UI in standings, tiebreaker explainer, bracket, map SVG, "How it works" onboarding, "what to watch", glossary content.

**2. Placeholder scan:** No `TBD`/`TODO` left as work markers. ("TBD" appears only as a *runtime team label* for undecided fixtures — intended.) Every code step includes complete code.

**3. Type consistency:** `createDataService` returns `{ updatedAt, stale, matches }` / `{ updatedAt, stale, groups, bestThirdIds }` consumed unchanged by `routes.js` and the frontend. `normalizeMatch` output shape (`home/away/score/city`) matches `MatchSticker` props. `advancementStatus` adds `status` consumed by `AdvancementBadge`. `rankGroup`/`bestThirds` signatures align across 1.6 and 1.8.

---

## Execution Handoff

After this plan is approved, implement it task-by-task with `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Plan 2 (Experience) is written separately and depends on the components and endpoints delivered here.
