// wp_head / wp_footer output comparison, old vs new design, for every blog URL: every <link>, <meta> and <script> in the document, minus the design's own assets.
import fs from 'node:fs';
import { launchChrome } from './cdp.mjs';
const T = process.env.PREVIEW_TOKEN, B = 'https://shashwatyadav.com';
const report = JSON.parse(fs.readFileSync(new URL('../blog-seo-report.json', import.meta.url), 'utf8'));
const fn = `(async (u, oldQs) => {
  const grab = async (qs) => (await fetch(u + '?' + qs + '&cb=' + Math.random(), { cache: 'no-store' })).text();
  const one = (html) => {
    const d = new DOMParser().parseFromString(html, 'text/html');
    const clean = (s) => (s || '').replace(/[?&](ver|v)=[^&"']*/g, '').replace(/&?(sbpreview|sbold|cb|x)=[^&"']*/g, '').replace('https://shashwatyadav.com', '');
    const out = [];
    for (const l of d.querySelectorAll('link')) out.push('link ' + (l.getAttribute('rel') || '') + ' ' + clean(l.getAttribute('href')) + ' ' + (l.getAttribute('id') || ''));
    for (const s of d.querySelectorAll('script')) out.push('script ' + (s.getAttribute('src') ? clean(s.getAttribute('src')) : (s.getAttribute('type') || 'inline') + ' #' + (s.id || '') + ' ' + s.textContent.replace(/\s+/g, ' ').slice(0, 50)));
    for (const s of d.querySelectorAll('style')) out.push('style #' + (s.id || '') + ' ' + s.textContent.replace(/\s+/g, ' ').slice(0, 30));
    for (const m of d.querySelectorAll('meta')) out.push('meta ' + (m.getAttribute('name') || m.getAttribute('property') || m.getAttribute('charset') || m.getAttribute('http-equiv')) + ' ' + clean(m.getAttribute('content')).slice(0, 80));
    return out;
  };
  return { o: one(await grab(oldQs)), n: one(await grab('x=1')) };
})`;
const chrome = await launchChrome(9349, []);
try {
  const pg = await chrome.newPage({ width: 800, height: 600 });
  await pg.goto(B + '/robots.txt', { settle: 300 });
  const all = { old: new Map(), new: new Map() };
  for (const u of Object.keys(report)) {
    const r = await pg.eval(`${fn}(${JSON.stringify(u)}, ${JSON.stringify('sbpreview=' + T + '&sbold=1')})`);
    for (const x of r.o) (all.old.get(x) || all.old.set(x, new Set()).get(x)).add(u);
    for (const x of r.n) (all.new.get(x) || all.new.set(x, new Set()).get(x)).add(u);
  }
  const design = /tailwind|fonts\.googleapis|fonts\.gstatic|assets\/css\/(style|theme)|blog(-v2)?\.css|theme\.js|sbl-blog|assets\/js\/main\.js|Plus\+Jakarta|favicon|preload|\/assets\/fonts\//;
  const show = (a, b, label) => { const lines = [...a.keys()].filter((k) => !b.has(k) && !design.test(k)); console.log(label + ': ' + (lines.length ? '' : 'none')); for (const l of lines) console.log('   ' + l.slice(0, 140) + '  [' + a.get(l).size + ' pages]'); };
  show(all.old, all.new, 'in OLD head/footer but not NEW (excluding design assets)');
  show(all.new, all.old, 'in NEW head/footer but not OLD (excluding design assets)');
  console.log('design-asset lines only in OLD:', [...all.old.keys()].filter((k) => !all.new.has(k) && design.test(k)).length, '| only in NEW:', [...all.new.keys()].filter((k) => !all.old.has(k) && design.test(k)).length);
} finally { await chrome.close(); }
