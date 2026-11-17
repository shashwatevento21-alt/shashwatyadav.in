// Live check after the SEO deploy: JSON-LD on all 22 static pages parses and equals the built graphs; titles/descriptions are the approved ones;
// the blog's #person node equals the static pages' #person node; the blog's other schema (BreadcrumbList, BlogPosting) is still there.
import fs from 'node:fs';
const B = 'https://shashwatyadav.com';
const root = new URL('../', import.meta.url);
const built = JSON.parse(fs.readFileSync(new URL('schema-graphs.json', root), 'utf8'));
const ov = JSON.parse(fs.readFileSync(new URL('seo-overrides.json', root), 'utf8'));
const ldOf = (html) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&#8211;/g, '–');
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? 'OK   ' : 'FAIL ') + m); };
let staticPerson;
for (const [p, g] of Object.entries(built)) {
  const html = await (await fetch(B + p + '?cb=' + Math.random())).text();
  let ld; try { ld = ldOf(html); } catch (e) { ok(false, p + ' JSON-LD does not parse'); continue; }
  const same = ld.length === 1 && JSON.stringify(ld[0]) === JSON.stringify(g);
  const title = dec((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').trim();
  const desc = dec((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  const o = ov[p] || {};
  ok(same && (!o.title || title === o.title) && (!o.description || desc === o.description) && title.length > 0, `${p.padEnd(54)} schema ${same ? 'live = built' : 'DIFFERENT'} | title ${title.length} chars${o.title ? ' (approved)' : ''} | desc ${desc.length}${o.description ? ' (approved)' : ''}`);
  if (p === '/') staticPerson = ld[0]['@graph'].find((n) => n['@id'] === 'https://shashwatyadav.com/#person');
}
const sm = await (await fetch(B + '/post-sitemap.xml')).text();
const posts = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(B, '')).filter((u) => u !== '/');
for (const u of ['/blog/', '/category/blog/', ...posts]) {
  const html = await (await fetch(B + u + '?cb=' + Math.random())).text();
  const ld = ldOf(html); const g = ld.flatMap((x) => x['@graph'] || [x]);
  const person = g.find((n) => n['@id'] === 'https://shashwatyadav.com/#person');
  const types = g.map((n) => [].concat(n['@type']).join('/'));
  ok(person && JSON.stringify(person) === JSON.stringify(staticPerson) && types.includes('BreadcrumbList') && types.includes('WebSite'), `${u.slice(0, 54).padEnd(54)} Person node ${person && JSON.stringify(person) === JSON.stringify(staticPerson) ? '= static' : 'DIFFERENT'} | ${types.filter((t) => /Breadcrumb|Article|BlogPosting|WebPage|Collection/.test(t)).join(', ')}`);
  if (person && JSON.stringify(person) !== JSON.stringify(staticPerson)) console.log('   blog person:', JSON.stringify(person).slice(0, 400));
}
console.log(bad ? bad + ' FAILURES' : 'all checks passed');
