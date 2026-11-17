// Tiny static server for local review and the Phase D checks: serves the repo root with the same clean URLs as the live .htaccess
// (/about -> about.html, /courses/ -> courses/index.html). Usage: node redesign/tools/serve.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.ROOT ? path.resolve(process.env.ROOT) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const port = Number(process.argv[2] || process.env.PORT || 8090);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.pdf': 'application/pdf' };

function resolve(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  const file = path.join(root, p);
  if (!file.startsWith(root)) return null;
  const tryFiles = [];
  if (p.endsWith('/')) tryFiles.push(path.join(file, 'index.html'));
  else tryFiles.push(file, file + '.html', path.join(file, 'index.html'));
  return tryFiles.find((f) => fs.existsSync(f) && fs.statSync(f).isFile()) || null;
}

// The Live Classes app is not part of this repo: GET requests under /classes are forwarded to the live site (read-only), so the pages behave as in production.
const APP_ORIGIN = process.env.APP_ORIGIN || 'https://shashwatyadav.com';
http.createServer(async (req, res) => {
  if (req.url.startsWith('/classes') && req.method === 'GET') {
    try {
      const r = await fetch(APP_ORIGIN + req.url, { redirect: 'manual', headers: { Accept: req.headers.accept || '*/*' } });
      res.writeHead(r.status, { 'Content-Type': r.headers.get('content-type') || 'text/plain', 'Cache-Control': 'no-store' });
      return res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) { res.writeHead(502); return res.end('app unavailable'); }
  }
  const f = resolve(req.url);
  if (!f) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
