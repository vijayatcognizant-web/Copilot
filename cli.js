#!/usr/bin/env node
'use strict';

const { request: httpReq }  = require('http');
const { request: httpsReq } = require('https');
const { spawn }             = require('child_process');

const BASE = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/+$/, '');
const [, , cmd, ...rest] = process.argv;

/* ── helpers ──────────────────────────────────────────────────────── */

function die(msg) {
  process.stderr.write(`snip: ${msg}\n`);
  process.exit(1);
}

/** JSON API request via global fetch (Node 18+ / Bun). */
async function apiFetch(path, opts) {
  try {
    return await fetch(BASE + path, opts);
  } catch (err) {
    die(`cannot reach backend at ${BASE} — ${err.message}`);
  }
}

/**
 * HTTP GET that never follows redirects; returns { status, location }.
 * Uses the built-in http/https module because fetch(redirect:'manual')
 * returns an opaque response with no Location header in Node.js.
 */
function getNoFollow(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https:') ? httpsReq : httpReq;
    const req = mod(url, { method: 'GET' }, (res) => {
      resolve({ status: res.statusCode, location: res.headers['location'] ?? null });
      res.resume();
    });
    req.on('error', reject);
    req.end();
  });
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
}

/* ── commands ─────────────────────────────────────────────────────── */

async function cmdAdd(url) {
  if (!url) die('add: URL argument required.\n       Usage: snip add <url>');
  const res  = await apiFetch('/api/links', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ url }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) die(`add: ${data.error || res.statusText}`);
  console.log(data.shortUrl);
}

async function cmdLs() {
  const res   = await apiFetch('/api/links');
  const links = await res.json().catch(() => []);
  if (!res.ok) die(`ls: ${links.error || res.statusText}`);
  if (!links.length) { console.log('No links yet.'); return; }

  const codeW = Math.max(4, ...links.map(l => l.code.length));
  const hitsW = Math.max(4, ...links.map(l => String(l.hits).length));
  console.log(`${'CODE'.padEnd(codeW)}  ${'HITS'.padStart(hitsW)}  URL`);
  console.log('-'.repeat(codeW + 2 + hitsW + 2 + 50));
  for (const l of links) {
    console.log(`${l.code.padEnd(codeW)}  ${String(l.hits).padStart(hitsW)}  ${l.url}`);
  }
}

async function cmdOpen(code) {
  if (!code) die('open: code argument required.\n       Usage: snip open <code>');
  let r;
  try {
    r = await getNoFollow(`${BASE}/${code}`);
  } catch (err) {
    die(`cannot reach backend at ${BASE} — ${err.message}`);
  }
  if (!r.location) {
    if (r.status === 404) die(`open: unknown code "${code}"`);
    die(`open: unexpected response status ${r.status}`);
  }
  try {
    openBrowser(r.location);
    console.log(`Opening: ${r.location}`);
  } catch {
    die(`open: could not launch browser for ${r.location}`);
  }
}

function usage() {
  console.log(`Snip — tiny URL shortener CLI

Usage:
  snip add <url>     Shorten a URL; prints the short link
  snip ls            List all short links
  snip open <code>   Open the URL behind a short code in your browser
  snip help          Show this message

Environment:
  SNIP_API=<url>     Backend base URL  (default: http://localhost:3000)`);
}

/* ── dispatch ─────────────────────────────────────────────────────── */

(async () => {
  switch (cmd) {
    case 'add':  await cmdAdd(rest[0]);  break;
    case 'ls':   await cmdLs();          break;
    case 'open': await cmdOpen(rest[0]); break;
    case 'help':
    case undefined: usage(); break;
    default:
      usage();
      process.stderr.write(`\nsnip: unknown command "${cmd}"\n`);
      process.exit(1);
  }
})();
