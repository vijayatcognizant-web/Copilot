import { join } from 'node:path';

const PORT    = parseInt(process.env.PORT || '3000', 10);
const BASE_URL =
  process.env.BASE_URL ??
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${PORT}`);
const PUBLIC_DIR = process.env.PUBLIC_DIR || null;

/** In-memory link store: code -> { code, url, shortUrl, hits, createdAt } */
const links = new Map();

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function randomCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => BASE62[b % 62]).join('');
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function tryStatic(pathname) {
  if (!PUBLIC_DIR) return null;
  // Resolve "/"  to index.html; strip leading slash for everything else.
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  // Block path-traversal attempts.
  if (rel.includes('..') || rel.includes('\0')) return null;
  const file = Bun.file(join(PUBLIC_DIR, rel));
  return (await file.exists()) ? new Response(file, { headers: CORS }) : null;
}

const server = Bun.serve({
  port: PORT,

  async fetch(req) {
    const { pathname } = new URL(req.url);
    const method = req.method;

    // ── CORS pre-flight ─────────────────────────────────────────────────────
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── POST /api/links — create a short link ───────────────────────────────
    if (method === 'POST' && pathname === '/api/links') {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: 'Invalid JSON' }, 400);
      }

      const raw = body?.url;
      if (typeof raw !== 'string') {
        return json({ error: 'url field is required and must be a string' }, 400);
      }

      let parsed;
      try {
        parsed = new URL(raw);
      } catch {
        return json({ error: 'Invalid URL' }, 400);
      }

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return json({ error: 'URL must use http or https protocol' }, 400);
      }

      let code;
      do { code = randomCode(); } while (links.has(code));

      const link = {
        code,
        url:      raw,
        shortUrl: `${BASE_URL}/${code}`,
        hits:     0,
        createdAt: new Date().toISOString(),
      };
      links.set(code, link);
      return json(link, 201);
    }

    // ── GET /api/links — list all links ─────────────────────────────────────
    if (method === 'GET' && pathname === '/api/links') {
      return json([...links.values()]);
    }

    // ── GET anything else — static file (wins) then short-code redirect ─────
    if (method === 'GET') {
      const staticRes = await tryStatic(pathname);
      if (staticRes) return staticRes;

      if (pathname.length > 1) {
        const code = pathname.slice(1);
        const link = links.get(code);
        if (link) {
          link.hits++;
          return new Response(null, {
            status: 302,
            headers: { Location: link.url, ...CORS },
          });
        }
      }
      return json({ error: 'Not found' }, 404);
    }

    return json({ error: 'Method not allowed' }, 405);
  },
});

console.log(`Snip listening on :${server.port}  BASE_URL=${BASE_URL}`);
