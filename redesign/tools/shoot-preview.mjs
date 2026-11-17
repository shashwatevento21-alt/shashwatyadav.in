// Screenshots the live private preview (desktop + mobile) and reports console errors / failed requests / overflow. Needs PREVIEW_TOKEN in the environment (blog preview).
import fs from 'node:fs';
import { launchChrome } from './cdp.mjs';
const T = process.env.PREVIEW_TOKEN || '';
const B = 'https://shashwatyadav.com';
const pages = { home: '/_preview/', about: '/_preview/about', courses: '/_preview/courses/', contact: '/_preview/contact', 'case-study': '/_preview/portfolio/hospital-multi-treatment-2026/', blog: `/blog/?sbpreview=${T}&sbnew=1` };
const post = process.env.POST_PATH; if (post) pages["blog-post"] = `/${post}?sbpreview=${T}&sbnew=1`;
const dir = new URL('../screens/preview/', import.meta.url); fs.mkdirSync(dir, { recursive: true });
const chrome = await launchChrome(9346, []);
try {
  for (const [n, p] of Object.entries(pages)) for (const [lbl, w, m] of [['desktop', 1280, false], ['mobile', 375, true]]) {
    const pg = await chrome.newPage({ width: w, height: 900, mobile: m });
    await pg.goto(B + p, { settle: 1800 }); await pg.scrollThrough();
    const info = await pg.eval(`({ overflow: document.documentElement.scrollWidth - innerWidth, title: document.title.slice(0, 60), h1: (document.querySelector('h1')||{}).textContent })`);
    const bad = pg.responses ? [...pg.responses].filter((r) => r.status >= 400).map((r) => r.status + ' ' + r.url.slice(0, 90)) : [];
    await pg.screenshot(new URL(`${n}-${lbl}.jpg`, dir).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
    console.log(n, lbl, JSON.stringify(info), 'errors:', pg.consoleErrors ? pg.consoleErrors.length : '?', bad.join(' | '));
    await pg.close();
  }
} finally { await chrome.close(); }
