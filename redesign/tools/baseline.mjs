// Phase A.2 (and Phase D): extract every coded page's content and take desktop + mobile full-page screenshots.
//   node redesign/tools/baseline.mjs                                   -> content-baseline.json + screens/before/   (live .com)
//   BASE=http://localhost:8090 OUT=content-after.json SHOTS=after node redesign/tools/baseline.mjs   (the redesigned build)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome } from './cdp.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const repo = path.join(root, '..');
const BASE = (process.env.BASE || 'https://shashwatyadav.com').replace(/\/$/, '');
const OUT = path.join(root, process.env.OUT || 'content-baseline.json');
const SHOTS = path.join(root, 'screens', process.env.SHOTS || 'before');
const NOSHOTS = !!process.env.NOSHOTS;
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const extractSrc = fs.readFileSync(path.join(here, 'extract-page.js'), 'utf8');

// the 22 coded pages = the sitemap's pages
const xml = fs.readFileSync(path.join(repo, 'sitemap-pages.xml'), 'utf8');
const paths = [...xml.matchAll(/<loc>https:\/\/shashwatyadav\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
const slug = (p) => (p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/\//g, '__'));

// what the pages' scripts talk to: read from the source files (so it does not depend on what happened to load)
function integrations() {
  const out = {};
  const files = ['assets/js/main.js', 'assets/js/live-classes.js', 'assets/js/course-detail.js', 'assets/js/master-classes.js', 'assets/js/chatbot-widget.js', 'assets/js/image-slot.js', 'assets/js/about.js', 'assets/js/journey.js'];
  for (const f of files) {
    const p = path.join(repo, f);
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8');
    out[f] = {
      bytes: src.length,
      absoluteUrls: [...new Set(src.match(/https?:\/\/[A-Za-z0-9._~:/?#@!$&*+,=%-]+/g) || [])].filter((u) => !/w3\.org/.test(u)),
      endpoints: [...new Set([...src.matchAll(/['"`](\/(?:classes|chatbot)[^'"`\s]*)['"`]/g)].map((m) => m[1]))],
      fetchCalls: [...src.matchAll(/fetch\(([^)]{0,120})\)/g)].map((m) => m[1].replace(/\s+/g, ' ')).slice(0, 12),
      localStorage: [...new Set([...src.matchAll(/localStorage\.(?:get|set)Item\(['"]([^'"]+)['"]/g)].map((m) => m[1]))],
      cookies: [...new Set([...src.matchAll(/['"](lc_[a-z_]+)['"]/g)].map((m) => m[1]))],
    };
  }
  return out;
}

// HOST_MAP=test.local runs the pages under a hostname that is not "localhost" (the site's scripts treat localhost as local development)
const chrome = await launchChrome(9336, process.env.HOST_MAP ? ['--host-resolver-rules=MAP ' + process.env.HOST_MAP + ' 127.0.0.1'] : []);
const result = { base: BASE, when: new Date().toISOString(), pageCount: 0, pages: {}, integrations: integrations() };
const errors = [];
try {
  for (const p of paths) {
    if (ONLY && !ONLY.includes(p) && !ONLY.includes(slug(p))) continue;
    const s = slug(p);
    const entry = {};
    try {
      // desktop 1280: content + network + screenshot
      const d = await chrome.newPage({ width: 1280, height: 800 });
      await d.goto(BASE + p, { settle: 1500 });
      await d.scrollThrough();
      Object.assign(entry, await d.eval(`(${extractSrc})()`));
      entry.network = [...new Map(d.requests.filter((r) => /\/classes\/|script\.google\.com|\/chatbot\/|googletagmanager|google-analytics|\/_next|api\./.test(r.url)).map((r) => [r.method + ' ' + r.url.replace(/[?#].*$/, ''), { method: r.method, url: r.url.replace(/[?#].*$/, '') }])).values()];
      entry.externalHosts = [...new Set(d.requests.map((r) => { try { return new URL(r.url).host; } catch { return ''; } }).filter((h) => h && !BASE.includes(h)))].sort();
      if (!NOSHOTS) entry.desktopShot = await d.screenshot(path.join(SHOTS, `${s}-desktop.jpg`));
      entry.desktopDocHeight = await d.eval('document.documentElement.scrollHeight');
      await d.close();
      // mobile 375: screenshot, overflow check
      const m = await chrome.newPage({ width: 375, height: 812, mobile: true });
      await m.goto(BASE + p, { settle: 1200 });
      await m.scrollThrough();
      if (!NOSHOTS) entry.mobileShot = await m.screenshot(path.join(SHOTS, `${s}-mobile.jpg`));
      entry.mobileOverflowX = await m.eval('document.documentElement.scrollWidth > innerWidth');
      entry.mobileDocHeight = await m.eval('document.documentElement.scrollHeight');
      await m.close();
      result.pages[p] = entry;
      result.pageCount++;
      console.log('ok', p, 'text words', entry.wordCount.content, 'links', entry.links.length, 'imgs', entry.images.length);
    } catch (e) {
      errors.push({ page: p, error: e.message });
      console.log('FAILED', p, e.message.slice(0, 140));
    }
  }
} finally {
  await chrome.close();
}
result.errors = errors;
fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
console.log('saved', OUT, result.pageCount, 'pages,', errors.length, 'errors');
