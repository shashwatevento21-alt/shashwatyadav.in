// Validates the JSON-LD graphs in the 22 static pages: parse check, required fields per type, @id references, and "is it really on the page".
//   node redesign/tools/validate-schema.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (f) => fs.readFileSync(path.join(repo, f), 'utf8').replace(/\r\n/g, '\n');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–');
const squash = (s) => decode(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const xml = read('sitemap-pages.xml');
const paths = [...xml.matchAll(/<loc>https:\/\/shashwatyadav\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
const fileFor = (p) => (p === '/' ? 'index.html' : p.endsWith('/') ? p.slice(1) + 'index.html' : p.slice(1) + '.html');

const REQUIRED = {
  Person: ['name', 'url'], Organization: ['name'], WebSite: ['url', 'name'], WebPage: ['url', 'name'], BreadcrumbList: ['itemListElement'],
  Service: ['name', 'provider', 'description'], Course: ['name', 'description', 'provider'], CreativeWork: ['headline', 'author'], Article: ['headline', 'author'],
  ProfessionalService: ['name', 'address', 'telephone'], LocalBusiness: ['name', 'address'], FAQPage: ['mainEntity'], ContactPage: ['url'], AboutPage: ['url'], CollectionPage: ['url'],
};
let errors = 0, warnings = 0, nodes = 0;
const err = (p, m) => { errors++; console.log('ERROR ' + p + ': ' + m); };
const warn = (p, m) => { warnings++; console.log('warn  ' + p + ': ' + m); };

for (const p of paths) {
  const html = read(fileFor(p));
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  if (blocks.length !== 1) { err(p, 'expected exactly 1 JSON-LD block, found ' + blocks.length); continue; }
  let data; try { data = JSON.parse(blocks[0][1]); } catch (e) { err(p, 'JSON does not parse: ' + e.message); continue; }
  const graph = data['@graph'];
  if (data['@context'] !== 'https://schema.org' || !Array.isArray(graph)) { err(p, 'missing @context or @graph'); continue; }
  const ids = new Map(); for (const n of graph) { nodes++; if (n['@id']) { if (ids.has(n['@id'])) err(p, 'duplicate @id ' + n['@id']); ids.set(n['@id'], n); } }
  const hay = squash(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<meta name="description" content="([^"]*)"/, ' $1 ').replace(/<style[\s\S]*?<\/style>/g, ' '));
  const onPage = (v) => typeof v === 'string' && hay.includes(squash(v));
  const refs = (o) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (v && typeof v === 'object' && Object.keys(v).length === 1 && v['@id']) { if (!ids.has(v['@id'])) err(p, `unresolved reference ${k} -> ${v['@id']}`); } else refs(v); } };
  refs(graph);
  for (const n of graph) {
    const types = [].concat(n['@type']);
    for (const t of types) for (const f of REQUIRED[t] || []) if (n[f] === undefined || n[f] === '') err(p, `${types.join('/')} ${n['@id'] || ''} missing "${f}"`);
    if (types.includes('BreadcrumbList')) n.itemListElement.forEach((it, i) => { if (it.position !== i + 1 || !it.name || !it.item) err(p, 'bad breadcrumb item ' + i); else if (!/^https:\/\/shashwatyadav\.com\//.test(it.item)) err(p, 'breadcrumb item not on the site ' + it.item); });
    if (types.includes('FAQPage')) for (const q of n.mainEntity) { if (!onPage(q.name)) err(p, 'FAQ question not on the page: ' + q.name); if (!onPage(q.acceptedAnswer.text)) err(p, 'FAQ answer not on the page: ' + q.name); }
    // facts must be on the page (Person/WebSite are site-wide facts and are not checked per page)
    if (types.some((t) => ['Service', 'Course', 'CreativeWork', 'WebPage'].includes(t))) for (const f of ['name', 'headline', 'description']) if (n[f] && !(types.includes('WebPage') && f === 'name' ? hay.includes(squash(n[f])) : onPage(n[f]))) err(p, `${types.join('/')} "${f}" text is not on the page: ${String(n[f]).slice(0, 70)}`);
    if (types.includes('BreadcrumbList')) for (const it of n.itemListElement) if (!onPage(it.name) && it.name !== 'Home') warn(p, 'breadcrumb name not literally on the page: ' + it.name);
    for (const [k, v] of Object.entries(n)) if (v === null || v === undefined) err(p, 'null value ' + k);
    if (n.datePublished || n.dateModified) err(p, 'a date was invented: ' + (n.datePublished || n.dateModified));
    if (JSON.stringify(n).match(/aggregateRating|"review"|"offers"|priceRange|price"/)) err(p, 'rating/review/price found');
  }
  // the graph's page node and canonical agree
  const wp = graph.find((n) => [].concat(n['@type']).includes('WebPage'));
  const canon = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  if (!wp || wp.url !== canon) err(p, `WebPage url ${wp && wp.url} differs from canonical ${canon}`);
}
console.log(`\n${paths.length} pages, ${nodes} nodes: ${errors} errors, ${warnings} warnings`);
process.exit(errors ? 1 : 0);
