// Cache busting: every page references its scripts and stylesheets as ?v=<hash of the file>, so a changed file is never served from a visitor's
// browser cache (the server sends Cache-Control: max-age=604800 for assets). Run after any change to a file under assets/.
// HTML comments (the commented-out chatbot blocks) are left exactly as they are.
//   node redesign/tools/version-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const hash = (f) => crypto.createHash('sha1').update(fs.readFileSync(path.join(repo, f))).digest('hex').slice(0, 8);
const xml = fs.readFileSync(path.join(repo, 'sitemap-pages.xml'), 'utf8');
const pages = [...xml.matchAll(/<loc>https:\/\/shashwatyadav\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/')
  .map((p) => (p === '/' ? 'index.html' : p.endsWith('/') ? p.slice(1) + 'index.html' : p.slice(1) + '.html'));
const REF = /(\/assets\/(?:js|css)\/[A-Za-z0-9._-]+\.(?:js|css))(\?v=[A-Za-z0-9]+)?(?=")/g;
let changed = 0, refs = 0;
for (const f of pages) {
  const file = path.join(repo, f);
  const html = fs.readFileSync(file, 'utf8');
  const out = html.split(/(<!--[\s\S]*?-->)/).map((part) => (part.startsWith('<!--') ? part : part.replace(REF, (m, asset) => {
    if (!fs.existsSync(path.join(repo, asset))) return m;
    refs++;
    return `${asset}?v=${hash(asset.slice(1))}`;
  }))).join('');
  if (out !== html) { fs.writeFileSync(file, out); changed++; }
}
console.log(`asset references versioned: ${refs} in ${pages.length} pages (${changed} pages changed)`);
