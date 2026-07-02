#!/usr/bin/env node
/**
 * scripts/build-bundle.mjs
 *
 * Assembles the snip "bundle" branch from the three source branches.
 * Run from the superproject root: node scripts/build-bundle.mjs [--push]
 *
 * Steps
 *   1. git submodule update --init --remote  backend frontend cli
 *   2. npm install + ng build  (or bun equivalents if npm absent)
 *   3. Assemble bundle/ — server.js, cli.js, public/, .env, package.json,
 *      Dockerfile, .dockerignore, railway.json
 *   4. Commit in bundle/  (HEAD:bundle)  — no-op when content unchanged
 *   5. Bump superproject pointers          — no-op when nothing changed
 *   --push  pushes bundle branch and main after each step that produced a commit
 */

import { execSync }                       from 'node:child_process';
import { existsSync, cpSync, mkdirSync,
         writeFileSync, readdirSync,
         rmSync }                         from 'node:fs';
import { join, dirname }                  from 'node:path';
import { fileURLToPath }                  from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');          // superproject root
const PUSH      = process.argv.includes('--push');

// ── helpers ──────────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  const tag = opts.cwd
    ? `[${String(opts.cwd).split(/[/\\]/).at(-1)}]`
    : '[root]';
  console.log(`  ${tag} $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

/**
 * Returns true when the git index differs from HEAD
 * (i.e. there are staged changes ready to commit).
 */
function hasStagedChanges(cwd) {
  try {
    execSync('git diff --cached --quiet', { cwd, stdio: 'ignore' });
    return false; // exit 0 — index matches HEAD
  } catch {
    return true;  // exit 1 — staged changes present
  }
}

/** Returns the first of 'npm' | 'bun' that is reachable on PATH. */
function findPkgManager() {
  for (const pm of ['npm', 'bun']) {
    try { execSync(`${pm} --version`, { stdio: 'ignore' }); return pm; }
    catch { /* try next */ }
  }
  throw new Error('Neither npm nor bun found in PATH — install one first.');
}

// ── 1. Update submodules to branch tips ──────────────────────────────────────

console.log('\n▶ 1/5  Updating submodules to branch tips');
run('git submodule update --init --remote backend frontend cli', { cwd: ROOT });

// ── 2. Build frontend ─────────────────────────────────────────────────────────

const frontendDir = join(ROOT, 'frontend');
const pm          = findPkgManager();

console.log(`\n▶ 2/5  Installing frontend dependencies  (${pm} install)`);
// On Windows, bun install can produce transient EBUSY errors on first run;
// a single retry is always clean once the cache is warm.
try {
  run(`${pm} install`, { cwd: frontendDir });
} catch {
  console.log('       ⚠ install had errors — retrying once (common Windows EBUSY)');
  run(`${pm} install`, { cwd: frontendDir });
}

console.log(`\n▶ 3/5  Building frontend  (${pm} run build)`);
run(`${pm} run build`, { cwd: frontendDir });

const browserDir = join(frontendDir, 'dist', 'snip-frontend', 'browser');
const indexHtml  = join(browserDir, 'index.html');
if (!existsSync(indexHtml)) {
  process.stderr.write(`\nBuild failed — expected file missing:\n  ${indexHtml}\n`);
  process.exit(1);
}
console.log('       ✓ dist/snip-frontend/browser/index.html confirmed');

// ── 3. Assemble bundle/ ───────────────────────────────────────────────────────

console.log('\n▶ 4/5  Assembling bundle/');
const bundleDir = join(ROOT, 'bundle');
const publicDir = join(bundleDir, 'public');

// Wipe previous output, preserving only the .git pointer file/dir.
for (const name of readdirSync(bundleDir)) {
  if (name === '.git') continue;
  rmSync(join(bundleDir, name), { recursive: true, force: true });
}

// Core sources
cpSync(join(ROOT, 'backend', 'server.js'), join(bundleDir, 'server.js'));
cpSync(join(ROOT, 'cli',     'cli.js'),    join(bundleDir, 'cli.js'));

// Frontend build output → public/
mkdirSync(publicDir, { recursive: true });
cpSync(browserDir, publicDir, { recursive: true });

// .env — Bun auto-loads this; switches server into also-serve-the-UI mode
writeFileSync(join(bundleDir, '.env'), 'PUBLIC_DIR=./public\n');

// package.json — "start": "bun server.js"; no "type" so cli.js runs under node
writeFileSync(join(bundleDir, 'package.json'), JSON.stringify({
  name:    'snip-bundle',
  version: '1.0.0',
  scripts: { start: 'bun server.js' },
}, null, 2) + '\n');

// Dockerfile
writeFileSync(join(bundleDir, 'Dockerfile'), [
  'FROM oven/bun:1-alpine',
  'WORKDIR /app',
  'COPY . .',
  'ENV PORT=3000',
  'EXPOSE 3000',
  'CMD ["bun", "server.js"]',
  '',
].join('\n'));

// .dockerignore
writeFileSync(join(bundleDir, '.dockerignore'), [
  '.git',
  'node_modules',
  '*.log',
  '',
].join('\n'));

// railway.json — DOCKERFILE builder
writeFileSync(join(bundleDir, 'railway.json'), JSON.stringify({
  $schema: 'https://railway.app/railway.schema.json',
  build:   { builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile' },
  deploy:  { startCommand: 'bun server.js', healthcheckPath: '/api/links' },
}, null, 2) + '\n');

console.log(
  '       ✓ server.js  cli.js  public/  .env  package.json' +
  '  Dockerfile  .dockerignore  railway.json',
);

// ── 4. Commit inside bundle/ ──────────────────────────────────────────────────

console.log('\n▶ 5/5  Committing & pushing');
const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z';

run('git add -A', { cwd: bundleDir });
if (hasStagedChanges(bundleDir)) {
  run(`git commit -m "build: bundle ${stamp}"`, { cwd: bundleDir });
} else {
  console.log('       bundle/: content unchanged — skipping commit');
}
if (PUSH) {
  // Submodule checkouts are detached; push current HEAD to the bundle branch.
  run('git push origin HEAD:bundle', { cwd: bundleDir });
}

// ── 5. Bump superproject pointers ────────────────────────────────────────────

run('git add backend frontend cli bundle', { cwd: ROOT });
if (hasStagedChanges(ROOT)) {
  run(`git commit -m "chore: bump submodule pointers (${stamp})"`, { cwd: ROOT });
} else {
  console.log('       superproject: pointers unchanged — no-op');
}
if (PUSH) {
  try {
    run('git push origin main', { cwd: ROOT });
  } catch {
    console.warn(
      '  ⚠ superproject push skipped — no remote "origin" configured.\n' +
      '    Run: git remote add origin <REPO_URL> && git push -u origin main',
    );
  }
}

console.log('\n✓ Done\n');
