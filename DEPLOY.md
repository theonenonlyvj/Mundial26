# Deploying Mundial26 (split: static SPA + API)

The blueprint (`render.yaml`) defines **two** services so the page loads instantly:

| Service          | Type   | What it is                         | Spins down? |
|------------------|--------|------------------------------------|-------------|
| `mundial26`      | static | the Vite SPA, served from the CDN  | **never**   |
| `mundial26-api`  | web    | the Express API (`/api/*`)         | after ~15m idle (cold-start ~30s) |

When the API is cold, the SPA still loads instantly and shows the in-app
cold-start banner until scores arrive. No keep-alive ping (stays within Render's ToS).

## One-time setup (Render dashboard)

The two services reference each other's URLs, so it's a two-pass wiring:

1. **Sync the blueprint.** Push `render.yaml` to `main`, then in Render → Blueprints,
   sync. It creates `mundial26-api` (web) and `mundial26` (static).
   - The old single `mundial26` web service can't change type in place — delete it
     and let the blueprint create the new pair. (This changes the public URL to the
     **static** site's URL — that becomes the address you share.)
2. **First build** runs with env vars still empty. That's fine; we fix it next.
3. **Grab the URLs** Render assigns, e.g.
   - API:    `https://mundial26-api.onrender.com`
   - SPA:    `https://mundial26.onrender.com`
4. **Set env vars:**
   - On `mundial26-api`: `FOOTBALL_DATA_API_KEY` = (the key) and
     `CLIENT_ORIGIN` = the **SPA** URL (e.g. `https://mundial26.onrender.com`).
   - On `mundial26` (static): `VITE_API_URL` = the **API** URL
     (e.g. `https://mundial26-api.onrender.com`).
5. **Redeploy the static site** (Manual Deploy → Clear build cache & deploy).
   `VITE_API_URL` is baked in at build time, so the SPA must rebuild after it's set.
   The API redeploys automatically to pick up `CLIENT_ORIGIN`.

## Verify

- `curl -i https://mundial26-api.onrender.com/api/health` → `200`, and includes
  `Access-Control-Allow-Origin: <SPA URL>`.
- Open the SPA URL: page paints immediately; on a cold API the gold banner shows,
  then scores replace it within ~30s.

## Local dev (unchanged)

`npm run dev` — vite serves the SPA and proxies `/api` to the local Express on
:3000 (`VITE_API_URL` unset → relative path). No CORS needed locally.
