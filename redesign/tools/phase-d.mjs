// Phase D checks on the redesigned build (served by serve.mjs on :8090, run under test.local so the scripts behave as in production):
//  1. every page at 375 / 768 / 1280: no horizontal scroll; 768 screenshots; the mobile menu opens and closes
//  2. every internal link and image on the 22 pages answers 200 (the app and the WordPress blog are checked on the live site)
//   node redesign/tools/phase-d.mjs
import fs from 'node:fs';
import { launchChrome } from './cdp.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = JSON.parse(fs.readFileSync(new URL('../content-after.json', import.meta.url), 'utf8'));
const pages = Object.keys(data.pages);
const slug = (p) => (p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/\//g, '__'));
const out = new URL('../screens/after/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const report = { overflow: [], menu: [], links: [] };

const chrome = await launchChrome(9342, ['--host-resolver-rules=MAP test.local 127.0.0.1']);
try {
  for (const p of pages) {
    for (const w of [375, 768, 1280]) {
      const pg = await chrome.newPage({ width: w, height: 900, mobile: w < 768 });
      await pg.goto('http://test.local:8090' + p, { settle: 900 });
      await pg.scrollThrough();
      const over = await pg.eval('document.documentElement.scrollWidth - innerWidth');
      if (over > 0) report.overflow.push(`${p} @${w}: +${over}px`);
      if (w === 768) await pg.screenshot(`${out}${slug(p)}-tablet.jpg`);
      if (w === 375 && (p === '/' || p === '/courses/' || p === '/about')) {
        await pg.eval('window.scrollTo(0,0)'); await sleep(200);
        const opened = await pg.eval(`(() => { const b = document.querySelector('.menu-toggle'); b.click(); return new Promise((r) => setTimeout(() => r({ expanded: b.getAttribute('aria-expanded'), panel: getComputedStyle(document.getElementById('site-nav')).visibility }), 500)); })()`);
        await pg.eval(`document.querySelector('.menu-toggle').click()`); await sleep(400);
        const closed = await pg.eval(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`);
        report.menu.push(`${p}: opened=${JSON.stringify(opened)} closedExpanded=${closed}`);
      }
      await pg.close();
    }
  }
} finally { await chrome.close(); }

// links and images
const urls = new Map();
for (const [p, e] of Object.entries(data.pages)) {
  for (const l of e.links || []) { const h = (l.href || '').replace(/#.*$/, ''); if (h) urls.set(h, p); }
  for (const i of e.images || []) { if (i.src) urls.set(i.src.replace(/#.*$/, ''), p); }
}
const LIVE = 'https://shashwatyadav.com';
const check = async (u, from) => {
  let url;
  try { url = new URL(u, 'http://test.local:8090' + from); } catch { return; }
  const internal = url.hostname === 'test.local' || url.hostname === 'shashwatyadav.com' || url.hostname === 'www.shashwatyadav.com';
  if (!internal) return;
  const live = /^\/(blog|classes|category|wp-|feed|tag|author|chatbot)/.test(url.pathname);
  const target = live ? LIVE + url.pathname + url.search : 'http://127.0.0.1:8090' + url.pathname + url.search;
  try {
    const r = await fetch(target, { redirect: 'follow' });
    report.links.push({ url: url.pathname + url.search, status: r.status, from, where: live ? 'live' : 'local' });
  } catch (e) { report.links.push({ url: url.pathname, status: 'ERR ' + e.message, from }); }
};
for (const [u, from] of urls) await check(u, from);
const bad = report.links.filter((l) => l.status !== 200);
console.log('pages', pages.length, '| unique internal links+images checked', report.links.length);
console.log('overflow problems:', report.overflow.length ? '\n  ' + report.overflow.join('\n  ') : 'none');
console.log('menu:\n  ' + report.menu.join('\n  '));
console.log('non-200:', bad.length ? '\n  ' + bad.map((b) => `${b.status} ${b.url} (on ${b.from}, ${b.where})`).join('\n  ') : 'none');
fs.writeFileSync(new URL('../phase-d-report.json', import.meta.url), JSON.stringify(report, null, 1));
