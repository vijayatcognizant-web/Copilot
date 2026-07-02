# Snip — tiny URL shortener

One backend, two clients. Three independent Git branches, wired together here
as submodules so every layer can be developed, tested, and deployed in isolation
while the `main` branch keeps a coherent, versioned snapshot of the whole system.

```
main  (this branch — superproject only)
├── backend/    ← branch: backend   — Bun HTTP server, in-memory store
├── frontend/   ← branch: frontend  — Angular 19 SPA
└── cli/        ← branch: cli       — Node.js zero-dependency CLI
```

---

## API contract

All endpoints are served by the backend on `http://localhost:3000` by default.
Open CORS headers are included on every response.

| Method | Path          | Request body              | Success                                          | Error                |
|--------|---------------|---------------------------|--------------------------------------------------|----------------------|
| `POST` | `/api/links`  | `{ "url": "https://…" }` | `201 { code, url, shortUrl, hits, createdAt }`   | `400 { error }`      |
| `GET`  | `/api/links`  | —                         | `200` array of link objects (same shape)         | —                    |
| `GET`  | `/:code`      | —                         | `302 → original URL` (increments `hits`)          | `404 { error }`      |

### Link object shape

```json
{
  "code":      "aB3xZ9",
  "url":       "https://example.com/very/long/path",
  "shortUrl":  "http://localhost:3000/aB3xZ9",
  "hits":      4,
  "createdAt": "2026-07-02T08:00:00.000Z"
}
```

---

## Repository layout

Each layer lives on its own **orphan branch** (no shared history).
The `main` branch contains only this README and `.gitmodules` — it holds nothing
except pointers (commit SHAs) to the other three branches.

```
Branches
  backend   server.js, package.json, README.md
  frontend  Angular 19 app — src/, angular.json, …
  cli       cli.js, snip{,.cmd,.ps1}, package.json, README.md

main        .gitmodules  +  README.md  (you are here)
  backend/  → submodule pinned to a commit on branch: backend
  frontend/ → submodule pinned to a commit on branch: frontend
  cli/      → submodule pinned to a commit on branch: cli
```

---

## Cloning

A plain `git clone` leaves the submodule folders **empty**. Always pass
`--recurse-submodules`:

```sh
git clone --recurse-submodules <REPO_URL>
```

If you already cloned without the flag, initialise afterwards:

```sh
git submodule update --init --recursive
```

> **Local-path note (development only):** the `.gitmodules` URLs currently point
> to the local repository path. Once a remote is added, update each URL:
>
> ```sh
> git submodule set-url backend  <REPO_URL>
> git submodule set-url frontend <REPO_URL>
> git submodule set-url cli      <REPO_URL>
> git add .gitmodules && git commit -m "chore: set remote submodule URLs"
> ```

---

## Running all three pieces

Open three terminal tabs from the root of a `--recurse-submodules` clone.

### 1 — Backend (start first)

```sh
cd backend
bun start          # listens on http://localhost:3000
```

> Env overrides: `PORT`, `BASE_URL`, `PUBLIC_DIR` (see `backend/README.md`)

### 2 — Frontend (Angular dev server)

```sh
cd frontend
npm install        # or: bun install
npx ng serve       # http://localhost:4200
```

Open <http://localhost:4200>, paste a URL, press **Snip it**.

> To serve the compiled frontend from the backend itself, build first
> (`npx ng build`) and set `PUBLIC_DIR=frontend/dist/snip-frontend/browser`
> when starting the backend.

### 3 — CLI

```sh
cd cli
node cli.js ls                    # list all short links
node cli.js add https://example.com
node cli.js open <code>           # opens in your default browser
```

> Set `SNIP_API=<url>` to point at a non-default backend address.

---

## Submodule update workflow

When you commit a change to one of the branches (e.g., the backend):

```sh
# 1. Work inside the submodule
cd backend
# … edit files …
git commit -am "fix: handle empty URL body"
git push                         # push the branch

# 2. Back in the superproject, advance the pointer
cd ..
git submodule update --remote backend
git add backend
git commit -m "chore: bump backend pointer"
git push
```

Repeat for `frontend` or `cli` as needed. Other consumers run
`git submodule update --remote` (or `--init --recursive`) to pull the latest
pinned commits.

---

## Environment variables reference

| Variable          | Default                    | Where used        | Description                              |
|-------------------|----------------------------|-------------------|------------------------------------------|
| `PORT`            | `3000`                     | backend           | HTTP port                                |
| `BASE_URL`        | `http://localhost:PORT`    | backend           | Origin prepended to generated short URLs |
| `PUBLIC_DIR`      | —                          | backend           | Serve static files from this folder      |
| `SNIP_API`        | `http://localhost:3000`    | cli               | Backend base URL                         |
