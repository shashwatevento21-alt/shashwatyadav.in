// Blog SEO comparison: the OLD design (?sbpreview=TOKEN&sbold=1) against the live NEW design, for /blog/, /category/blog/ and every post.
//   PREVIEW_TOKEN=... node redesign/tools/blog-seo-compare.mjs      -> prints a table, writes redesign/blog-seo-report.json
import fs from 'node:fs';
import { launchChrome } from './cdp.mjs';

const T = process.env.PREVIEW_TOKEN;
const B = 'https://shashwatyadav.com';
const sm = await (await fetch(B + '/post-sitemap.xml')).text();
const posts = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(B, '')).filter((u) => u !== '/');
const urls = ['/blog/', '/category/blog/', ...posts];

const extract = `(async (u, oldQs, newQs) => {
  const grab = async (qs) => { const r = await fetch(u + (u.includes('?') ? '&' : '?') + qs + '&cb=' + Math.random(), { cache: 'no-store' }); return { status: r.status, html: await r.text() }; };
  const norm = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const one = (html) => {
    const d = new DOMParser().parseFromString(html, 'text/html');
    const meta = (sel) => [...d.querySelectorAll(sel)].map((m) => m.getAttribute('content'));
    const main = d.querySelector('main') || d.body;
    const prose = d.querySelector('.sbl-prose') || d.querySelector('.sbl-main');
    const ld = [...d.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent); } catch (e) { return { __invalid: String(e) }; } });
    const metas = {};
    for (const m of d.querySelectorAll('meta[property], meta[name]')) { const k = m.getAttribute('property') || m.getAttribute('name'); if (/^(og:|twitter:|article:|robots|description|author|keywords|googlebot)/.test(k)) (metas[k] = metas[k] || []).push(m.getAttribute('content')); }
    const heads = [...main.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => h.tagName.toLowerCase() + ' ' + norm(h.textContent));
    const imgs = [...(prose || main).querySelectorAll('img')].map((i) => ({ src: i.getAttribute('src'), alt: i.getAttribute('alt'), w: i.getAttribute('width'), h: i.getAttribute('height'), srcset: i.getAttribute('srcset') ? 'yes' : '' }));
    const feat = d.querySelector('.sbl-feature img');
    const links = [...(prose || main).querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href'), text: norm(a.textContent), rel: a.getAttribute('rel') || '', target: a.getAttribute('target') || '' }));
    const times = [...d.querySelectorAll('time')].map((t) => t.getAttribute('datetime'));
    const crumbs = [...d.querySelectorAll('.sbl-crumbs li')].map((l) => norm(l.textContent));
    const heads2 = {
      scripts: [...d.querySelectorAll('head script[src], body script[src]')].map((s) => s.getAttribute('src').replace(/[?&](ver|v)=[^&]*/, '').replace(/^https?:\\/\\/shashwatyadav\\.com/, '')),
      styles: [...d.querySelectorAll('link[rel="stylesheet"]')].map((s) => s.getAttribute('href').replace(/[?&](ver|v)=[^&]*/, '').replace(/^https?:\\/\\/shashwatyadav\\.com/, '')),
      rankMath: /<!-- (?:\\/ )?Rank Math/.test(html), gtmHead: /googletagmanager\\.com\\/gtm\\.js/.test(html) || /GTM-5SRRSFV6/.test(html), gtmNoscript: /ns\\.html\\?id=GTM-5SRRSFV6/.test(html),
      wpHeadMark: /<link rel='dns-prefetch'|<link rel="alternate"|wp-json/.test(html), wpFooterMark: /wp-embed|wp-includes\\/js|wp-emoji|litespeed/i.test(html),
    };
    return {
      title: norm(d.title), description: meta('meta[name=description]'), canonical: [...d.querySelectorAll('link[rel=canonical]')].map((l) => l.href),
      robots: meta('meta[name=robots]'), metas, ld, h1: d.querySelectorAll('h1').length, heads, imgs, feat: feat ? { src: feat.getAttribute('src'), alt: feat.getAttribute('alt') } : null,
      links, times, crumbs, ...heads2, lang: d.documentElement.getAttribute('lang'),
    };
  };
  const o = await grab(oldQs), n = await grab(newQs);
  return { oldStatus: o.status, newStatus: n.status, old: one(o.html), new: one(n.html) };
})`;

const chrome = await launchChrome(9348, []);
const report = {};
try {
  const pg = await chrome.newPage({ width: 1000, height: 800 });
  await pg.goto(B + '/robots.txt', { settle: 300 });
  for (const u of urls) report[u] = await pg.eval(`${extract}(${JSON.stringify(u)}, ${JSON.stringify(`sbpreview=${T}&sbold=1`)}, ${JSON.stringify('x=1')})`);
} finally { await chrome.close(); }
fs.writeFileSync(new URL('../blog-seo-report.json', import.meta.url), JSON.stringify(report, null, 1));

const J = (x) => JSON.stringify(x);
const diffs = {};
for (const [u, r] of Object.entries(report)) {
  const o = r.old, n = r.new, d = [];
  const cmp = (name, a, b) => { if (J(a) !== J(b)) d.push(`${name}: OLD ${J(a).slice(0, 160)} | NEW ${J(b).slice(0, 160)}`); };
  if (r.oldStatus !== 200 || r.newStatus !== 200) d.push(`status old ${r.oldStatus} new ${r.newStatus}`);
  cmp('title', o.title, n.title); cmp('description', o.description, n.description); cmp('canonical', o.canonical, n.canonical); cmp('robots', o.robots, n.robots); cmp('lang', o.lang, n.lang);
  for (const k of new Set([...Object.keys(o.metas), ...Object.keys(n.metas)])) cmp('meta ' + k, o.metas[k], n.metas[k]);
  cmp('JSON-LD', o.ld, n.ld);
  cmp('h1 count', o.h1, n.h1); cmp('headings', o.heads.filter((h) => !/^h[1-6] (Home|Blog)$/.test(h)), n.heads.filter((h) => !/^h[1-6] (Home|Blog)$/.test(h)));
  cmp('images', o.imgs, n.imgs); cmp('featured image', o.feat, n.feat);
  cmp('body links', o.links, n.links); cmp('times', o.times, n.times); cmp('breadcrumb', o.crumbs, n.crumbs);
  cmp('rankMath/GTM flags', [o.rankMath, o.gtmHead, o.gtmNoscript], [n.rankMath, n.gtmHead, n.gtmNoscript]);
  diffs[u] = d;
}
console.log('URLs compared:', urls.length);
for (const [u, d] of Object.entries(diffs)) { console.log((d.length ? 'DIFF ' : 'SAME ') + u); for (const x of d) console.log('     ' + x); }
// wp_head / wp_footer output: scripts and stylesheets present in only one design (theme assets are expected to differ)
const first = report[urls[2]];
const only = (a, b) => a.filter((x) => !b.includes(x));
console.log('\nscripts only in OLD:', only(first.old.scripts, first.new.scripts).join(' | '));
console.log('scripts only in NEW:', only(first.new.scripts, first.old.scripts).join(' | '));
console.log('styles only in OLD:', only(first.old.styles, first.new.styles).join(' | '));
console.log('styles only in NEW:', only(first.new.styles, first.old.styles).join(' | '));
