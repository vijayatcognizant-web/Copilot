# snip-demo — Agent Rules

> **Mirror:** `CLAUDE.md` at the repo root is a copy of this file. Keep both in sync.

This is a **superproject on `main`** that wires three independent orphan branches as
Git submodules. Each layer lives, builds, and is deployed in isolation; `main` only
pins specific commits from each.

---

## Layout & tech stack

| Path | Branch | Stack | Role |
|------|--------|-------|------|
| `backend/` | `backend` | Bun, ESM, zero npm deps | HTTP server; in-memory URL store |
| `frontend/` | `frontend` | Angular 19, TypeScript | SPA — dev :4200, bundled :3000 |
| `cli/` | `cli` | Node.js CJS, zero npm deps | Command-line client |
| `bundle/` | `bundle` | assembled output | ⛔ GENERATED — never hand-edit |
| `scripts/` | `main` | Node.js ESM (.mjs) | Build tooling |
| `.github/workflows/` | `main` | GitHub Actions | CI: hourly bundle build + GHCR push |

---

## API contract — change every layer or none

| Method | Path | Request body | 2xx | Error |
|--------|------|-------------|-----|-------|
| `POST` | `/api/links` | `{ "url": "https://…" }` | `201 { code, url, shortUrl, hits, createdAt }` | `400 { error }` |
| `GET` | `/api/links` | — | `200 [{ … }]` | — |
| `GET` | `/:code` | — | `302` → original URL (hits++) | `404 { error }` |

- Codes: 6 random base-62 characters (`[A-Za-z0-9]{6}`).
- All endpoints include open CORS headers (`Access-Control-Allow-Origin: *`).
- Storage is an **in-memory `Map`** — intentional, no persistence needed.

---

## Key commands

```sh
# Run pieces independently
cd backend  && bun start                        # :3000
cd frontend && bun install && bun run build     # → dist/snip-frontend/browser/
cd frontend && bun run start                    # dev server :4200
cd cli      && node cli.js help

# Assemble and optionally push the bundle
node scripts/build-bundle.mjs           # dry run — no push
node scripts/build-bundle.mjs --push    # build + commit bundle + bump main pointer

# One-process production mode (SPA + API + redirects)
cd bundle && bun start                          # :3000
```

---

## Edit → push → pointer-bump workflow

```
1. Edit files inside the submodule folder (backend/, frontend/, or cli/)
2. git commit -am "..." && git push
3. From superproject root:
   git submodule update --remote <path>
   git add <path>
   git commit -m "chore: bump <path> pointer" && git push
```

`node scripts/build-bundle.mjs --push` automates step 3 for all four submodules.

---

## Do / Don't — non-obvious traps

| | Rule | Why |
|-|------|-----|
| ⛔ | **Never edit `bundle/` directly** | Generated output; overwritten on every build run |
| ⛔ | **Never add `"type":"module"` to `bundle/package.json` or next to `cli/cli.js`** | `cli.js` uses CommonJS `require()` — ESM package mode breaks `node cli.js` |
| ⛔ | **Do not rename or move `dist/snip-frontend/browser/`** | Hard-coded in `build-bundle.mjs` and checked explicitly; rename = broken CI |
| ⛔ | **Do not add a `push:` trigger to `.github/workflows/bundle.yml`** | That file only exists on `main`; a push trigger would never fire for `backend`/`frontend`/`cli` commits (they live on orphan branches that don't contain this file) |
| ✅ | **`docker.yml` `paths: [bundle]` watches the gitlink, not files inside `bundle/`** | The `bundle` entry is a `160000`-mode gitlink; the paths filter fires when a new bundle commit is pinned on `main` — not on every source change |
| ✅ | **In-memory storage is by design** | No DB needed for this demo; add persistence on the `backend` branch if required |
| ✅ | **`server.js` is ESM (`import`); `cli.js` is CJS (`require`)** | Both zero-dep: Bun runs ESM natively; plain `node` runs CJS natively |
| ✅ | **CORS is open (`*`)** | Expected — Angular at :4200 calls the backend at :3000 in dev mode |
| ✅ | **`bundle/.env` sets `PUBLIC_DIR=./public`** | Bun auto-loads `.env`; this single line switches the server into also-serve-the-SPA mode |
