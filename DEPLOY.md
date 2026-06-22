# Deploying Mundial26 (non-destructive split)

The old URL (`mundial26-y28p.onrender.com`) was already shared, so we **keep it**.
The blueprint keeps the existing `mundial26` web service unchanged and adds an
always-on static site beside it:

| Service          | Type   | What it is                              | Spins down? | URL |
|------------------|--------|-----------------------------------------|-------------|-----|
| `mundial26`      | web    | existing combined app (SPA + API)       | after ~15m idle | **`-y28p` (unchanged, still works)** |
| `mundial26-app`  | static | the SPA on the CDN, calls the API above | **never**   | new — **share this one going forward** |

Visitors to the new static URL get an instant page; while the API is cold the
in-app banner shows, then scores arrive (~30s). Old `-y28p` links keep working
exactly as before. No keep-alive ping (within Render's ToS).

## Setup (Render dashboard)

1. **Sync the blueprint.** Render → Blueprints → sync. This is **non-destructive**:
   it updates the existing `mundial26` web service in place (URL preserved) and
   **creates** `mundial26-app` (static). Nothing is deleted.
2. **Grab the static URL** Render assigns, e.g. `https://mundial26-app.onrender.com`.
   The API URL is your existing `https://mundial26-y28p.onrender.com`.
3. **Set env vars:**
   - On `mundial26` (web): add `CLIENT_ORIGIN` = the **static** URL
     (e.g. `https://mundial26-app.onrender.com`). `FOOTBALL_DATA_API_KEY` is
     already set from the original deploy — leave it.
   - On `mundial26-app` (static): `VITE_API_URL` = the existing **web** URL
     (`https://mundial26-y28p.onrender.com`).
4. **Redeploy the static site** (Manual Deploy → Clear build cache & deploy).
   `VITE_API_URL` is baked in at build time, so the SPA must rebuild after it's set.
   The web service redeploys automatically to pick up `CLIENT_ORIGIN`.

## Verify

- `curl -i https://mundial26-y28p.onrender.com/api/health` → `200`, and once
  `CLIENT_ORIGIN` is set, includes `Access-Control-Allow-Origin: <static URL>`.
- Open the static URL: page paints immediately; on a cold API the gold banner
  shows, then scores replace it within ~30s.
- Open the old `-y28p` URL: still serves the full app as before.

## Optional later

Make the old `-y28p` URL forward to the fast static site (one cold-start on first
hit after idle, then instant). Say the word and I'll wire the redirect.

## Local dev (unchanged)

`npm run dev` — vite serves the SPA and proxies `/api` to local Express on :3000
(`VITE_API_URL` unset → relative path). No CORS needed locally.
