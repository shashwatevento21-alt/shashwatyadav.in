// Verifies the three blog SEO fixes on the live site and that nothing else in the SEO data moved (compared with redesign/blog-seo-report-before-fixes.json).
import fs from 'node:fs';
import { launchChrome } from './cdp.mjs';
const B = 'https://shashwatyadav.com';
const before = JSON.parse(fs.readFileSync(new URL('../blog-seo-report-before-fixes.json', import.meta.url), 'utf8'));
const xml = fs.readFileSync(new URL('../../sitemap-pages.xml', import.meta.url), 'utf8');
const statics = [...xml.matchAll(/<loc>https:\/\/shashwatyadav\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
const fn = fs.readFileSync(new URL('./blog-extract.js', import.meta.url), 'utf8');
const chrome = await launchChrome(9350, []);
const out = [];
try {
  const pg = await chrome.newPage({ width: 800, height: 600 });
  await pg.goto(B + '/robots.txt', { settle: 300 });
  for (const u of Object.keys(before)) {
    const n = await pg.eval(`(${fn.trim()})(${JSON.stringify(u)})`), o = before[u].new;
    const bc = n.ld.flatMap((x) => (x && x['@graph']) || [x]).find((x) => x && [].concat(x['@type']).includes('BreadcrumbList'));
    const items = bc ? bc.itemListElement.map((i) => ({ name: i.item.name, url: i.item['@id'] })) : [];
    const visible = n.crumbs.map((c) => c.text);
    const schemaNames = items.map((i) => i.name);
    const matches = JSON.stringify(visible) === JSON.stringify(schemaNames);
    const noLdBc = (arr) => JSON.stringify(arr.map((x) => ({ ...x, '@graph': x['@graph'] && x['@graph'].filter((g) => ![].concat(g['@type']).includes('BreadcrumbList')) })));
    const sameRest = noLdBc(n.ld) === noLdBc(o.ld);
    const sameSeo = n.title === o.title && JSON.stringify(n.description) === JSON.stringify(o.description) && JSON.stringify(n.canonical) === JSON.stringify(o.canonical) && JSON.stringify(n.metas) === JSON.stringify(o.metas);
    out.push({ u, bc: schemaNames.join(' > ') || 'NONE', schemaMatchesVisible: matches, validJson: n.ld.every(Boolean), restOfSchemaSame: sameRest, titleMetaCanonicalOgSame: sameSeo, h1: n.h1, gtmRightAfterBody: /^<noscript><iframe src="https:\/\/www\.googletagmanager\.com\/ns\.html\?id=GTM-5SRRSFV6"/.test(n.bodyStart.replace(/^<!--.*?-->\s*/, '')) || /GTM-5SRRSFV6/.test(n.bodyStart), noscriptCount: n.noscriptCount, urlsOk: items.every((i) => i.url.startsWith(B)) });
  }
  console.log(JSON.stringify(out.map((r) => ({ ...r, u: r.u.slice(0, 42) })), null, 0).replace(/\},\{/g, '},\n{'));
  // static pages: GTM noscript right after <body>
  let ok = 0; const bad = [];
  for (const p of statics) {
    const n = await pg.eval(`(${fn.trim()})(${JSON.stringify(p)})`);
    (/GTM-5SRRSFV6/.test(n.bodyStart) && n.noscriptCount === 1 ? ok++ : bad.push(p + ' ' + n.bodyStart.slice(0, 60) + ' x' + n.noscriptCount));
  }
  console.log(`static pages with the GTM noscript right after <body> (exactly once): ${ok}/${statics.length}`, bad.join(' | '));
} finally { await chrome.close(); }
