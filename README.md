# Snip — tiny URL shortener (backend)

A single-file [Bun](https://bun.sh) server. Zero npm dependencies.

## Quick start

```sh
bun start
```

## API

| Method | Path | Body / Response |
|--------|------|-----------------|
| `POST` | `/api/links` | `{ "url": "https://…" }` → `201 { code, url, shortUrl, hits, createdAt }` |
| `GET`  | `/api/links` | `200` array of all links |
| `GET`  | `/:code`     | `302` redirect (hits++), `404` if unknown |

Codes are 6 random base-62 characters.  
All endpoints include open CORS headers and handle `OPTIONS` preflight.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `BASE_URL` | `http://localhost:PORT` | Origin used in `shortUrl`. Falls back to `https://$RAILWAY_PUBLIC_DOMAIN` when that env var is set |
| `PUBLIC_DIR` | — | If set, serve static files from this folder (`/` → `index.html`). Static files take priority over short codes |

## Deployment (Railway)

Set `RAILWAY_PUBLIC_DOMAIN` (automatic on Railway) and start command `bun run server.js`.
