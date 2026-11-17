// Phase E: builds the private preview of the redesign into redesign/preview-build/ (uploaded to https://shashwatyadav.com/_preview/).
// The preview is a COPY of the site with: root-absolute site paths pointed at /_preview/, a noindex robots meta on every page, and a
// .htaccess that sends X-Robots-Tag: noindex. Links to the WordPress blog and the Live Classes app are left alone (they keep working live).
//   node redesign/tools/build-preview.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = path.join(repo, 'redesign', 'preview-build');
const P = '/_preview';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const xml = fs.readFileSync(path.join(repo, 'sitemap-pages.xml'), 'utf8');
const pagePaths = [...xml.matchAll(/<loc>https:\/\/shashwatyadav\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
const fileFor = (p) => (p === '/' ? 'index.html' : p.endsWith('/') ? p.slice(1) + 'index.html' : p.slice(1) + '.html');

const KEEP = /^\/(classes|blog|category|wp-|chatbot|feed|tag|author|xmlrpc|llms\.txt|robots\.txt|sitemap)/; // stays on the live site
const rewriteUrl = (u) => (u.startsWith('/') && !u.startsWith('//') && !KEEP.test(u) && !u.startsWith(P + '/') ? P + u : u);

function rewriteHtml(html) {
  html = html.replace(/\b(href|src|action|poster|data-image|data-src)="(\/[^"]*)"/g, (m, a, u) => `${a}="${rewriteUrl(u)}"`);
  html = html.replace(/\bsrcset="([^"]*)"/g, (m, s) => `srcset="${s.split(',').map((x) => x.trim().replace(/^(\S+)/, (u) => rewriteUrl(u))).join(', ')}"`);
  // preview pages must never be indexed (replaces any robots meta the page already has)
  html = html.replace(/<meta name="robots"[^>]*>\s*/gi, '');
  html = html.replace(/<meta charset="UTF-8">/i, (m) => `${m}\n  <meta name="robots" content="noindex, nofollow">`);
  if (!/name="robots" content="noindex, nofollow"/.test(html)) throw new Error('could not add the noindex meta');
  return html;
}

const put = (rel, data) => { const f = path.join(out, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };
for (const p of pagePaths) put(fileFor(p), rewriteHtml(fs.readFileSync(path.join(repo, fileFor(p)), 'utf8')));

// assets: copied whole; CSS url(/assets/...) and the two script strings that point at site pages are repointed
function copyDir(src, dst) {
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyDir(s, d); continue; }
    let data = fs.readFileSync(s);
    if (e.name.endsWith('.css')) data = Buffer.from(data.toString('utf8').replace(/url\((["']?)\/assets\//g, `url($1${P}/assets/`));
    if (e.name === 'live-classes.js') data = Buffer.from(data.toString('utf8').replace("setAttribute('href', '/courses/')", `setAttribute('href', '${P}/courses/')`));
    if (e.name === 'master-classes.js') data = Buffer.from(data.toString('utf8').replace("'/courses/?course='", `'${P}/courses/?course='`));
    fs.writeFileSync(d, data);
  }
}
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
copyDir(path.join(repo, 'assets'), path.join(out, 'assets'));

put('.htaccess', 'Header set X-Robots-Tag "noindex, nofollow"\nOptions -Indexes\nHeader set Cache-Control "no-store"\n');
put('README.txt', 'Private preview of the shashwatyadav.com redesign. Not indexed. Delete this folder after go-live.\n');
const count = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0);
console.log('preview built:', pagePaths.length, 'pages,', count(out), 'files ->', out);
