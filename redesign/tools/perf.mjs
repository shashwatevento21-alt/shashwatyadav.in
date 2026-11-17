// Before / after page metrics measured with the same harness (mobile 375x812, no network throttling, median of 3 loads):
// first contentful paint, largest contentful paint, layout shift, long-task time (a total-blocking-time stand-in), requests, bytes, DOM nodes.
// BEFORE = the old site (main branch) served by redesign/tools/serve.mjs on :8093 (ROOT=<worktree>); AFTER = this branch on :8090.
//   node redesign/tools/perf.mjs
import fs from 'node:fs';
import { launchChrome } from './cdp.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const paths = ['/', '/courses/', '/portfolio/hospital-multi-treatment-2026/'];
const sets = [['before', 'http://test.local:8093'], ['after', 'http://test.local:8090']];
const probe = `(() => new Promise((resolve) => {
  const o = { lcp: 0, cls: 0, longMs: 0, fcp: 0 };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) o.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) o.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) o.longMs += Math.max(0, e.duration - 50); }).observe({ type: 'longtask', buffered: true });
  setTimeout(() => {
    const f = performance.getEntriesByName('first-contentful-paint')[0]; o.fcp = f ? f.startTime : 0;
    const res = performance.getEntriesByType('resource');
    o.requests = res.length + 1;
    o.bytes = res.reduce((a, r) => a + (r.encodedBodySize || r.decodedBodySize || 0), 0);
    o.hosts = [...new Set(res.map((r) => new URL(r.name).host))].filter((h) => h !== location.host);
    o.nodes = document.getElementsByTagName('*').length;
    resolve(o);
  }, 2500);
}))()`;
const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];

const chrome = await launchChrome(9343, ['--host-resolver-rules=MAP test.local 127.0.0.1']);
const results = {};
try {
  for (const p of paths) for (const [label, base] of sets) {
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const pg = await chrome.newPage({ width: 375, height: 812, mobile: true });
      await pg.goto(base + p, { settle: 300 });
      runs.push(await pg.eval(probe).catch(() => null));
      await pg.close();
    }
    const ok = runs.filter(Boolean);
    results[label + ' ' + p] = {
      fcp: Math.round(med(ok.map((r) => r.fcp))), lcp: Math.round(med(ok.map((r) => r.lcp))), cls: +med(ok.map((r) => r.cls)).toFixed(3),
      longTaskMs: Math.round(med(ok.map((r) => r.longMs))), requests: med(ok.map((r) => r.requests)), kb: Math.round(med(ok.map((r) => r.bytes)) / 1024),
      nodes: med(ok.map((r) => r.nodes)), external: ok[0].hosts.join(', ') || 'none',
    };
    console.log(label, p, JSON.stringify(results[label + ' ' + p]));
  }
} finally { await chrome.close(); }
fs.writeFileSync(new URL('../perf-report.json', import.meta.url), JSON.stringify(results, null, 1));
