// Phase B: screenshots of the header, footer and component sample (desktop + mobile) and objective checks. Needs the dev server on :8090.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'screens', 'phaseB');
const URL_ = process.env.URL_ || 'http://127.0.0.1:8090/redesign/sample/components';
const checks = {};
const chrome = await launchChrome(9342);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const common = `({
  width: innerWidth, docWidth: document.documentElement.scrollWidth,
  overflowX: document.documentElement.scrollWidth > innerWidth,
  headerH: Math.round(document.getElementById('navbar').getBoundingClientRect().height),
  fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '') + ' ' + f.weight).sort(),
  bodyFont: getComputedStyle(document.body).fontFamily.split(',')[0], h1Font: getComputedStyle(document.querySelector('h1')).fontFamily.split(',')[0],
  burgerShown: getComputedStyle(document.querySelector('.menu-toggle')).display !== 'none',
  navListShown: getComputedStyle(document.querySelector('.nav-list')).display !== 'none' && document.querySelector('.nav').getBoundingClientRect().height > 0,
})`;
const barFit = `(() => { const bar = document.querySelector('.bar'); const nav = document.querySelector('.nav'); const kids = [...nav.querySelectorAll('.nav-list a, .nav-actions > a, .nav-actions .btn')].map(a => a.getBoundingClientRect()); const top = Math.min(...kids.map(k => k.top)), bot = Math.max(...kids.map(k => k.bottom)); return { barInner: Math.round(bar.clientWidth - 2 * parseFloat(getComputedStyle(bar).paddingLeft)), navWidth: Math.round(nav.getBoundingClientRect().width), rowHeight: Math.round(bot - top), wrapped: (bot - top) > 60, brandRight: Math.round(document.querySelector('.brand').getBoundingClientRect().right), navLeft: Math.round(nav.getBoundingClientRect().left) }; })()`;

async function open(w, h, mobile) {
  const p = await chrome.newPage({ width: w, height: h, mobile });
  await p.goto(URL_, { settle: 1500 });
  return p;
}

try {
  // ---------- desktop 1440
  let p = await open(1440, 900, false);
  await p.scrollThrough();
  checks.desktop1440 = { ...(await p.eval(common)), barFit: await p.eval(barFit), bad: p.responses.filter((r) => r.status >= 400).map((r) => r.status + ' ' + r.url), consoleErrors: p.consoleErrors };
  await p.screenshot(path.join(out, 'components-desktop.jpg'));
  await p.eval('window.scrollTo(0,0)'); await sleep(300);
  await p.clipShot(path.join(out, 'header-desktop.jpg'), { x: 0, y: 0, width: 1440, height: 420 });
  await p.hover('.has-menu > a'); await sleep(600);
  checks.desktop1440.dropdownOpen = await p.eval(`getComputedStyle(document.querySelector('.has-menu > .menu')).visibility === 'visible'`);
  await p.clipShot(path.join(out, 'header-desktop-courses-menu.jpg'), { x: 0, y: 0, width: 1440, height: 520 });
  await p.eval('document.querySelector("footer").scrollIntoView()'); await sleep(500);
  await p.elementShot(path.join(out, 'footer-desktop.jpg'), 'footer');
  await p.close();

  // ---------- laptop 1280 and wide tablet 1024: does the header fit / collapse properly
  for (const w of [1280, 1100]) {
    p = await open(w, 800, false);
    checks['viewport' + w] = { ...(await p.eval(common)), barFit: await p.eval(barFit) };
    await p.clipShot(path.join(out, `header-${w}.jpg`), { x: 0, y: 0, width: w, height: 300 });
    await p.close();
  }

  // ---------- tablet 768
  p = await open(768, 1024, false);
  await p.scrollThrough();
  checks.tablet768 = { ...(await p.eval(common)), bad: p.responses.filter((r) => r.status >= 400).length };
  await p.screenshot(path.join(out, 'components-tablet.jpg'));
  await p.close();

  // ---------- mobile 375
  p = await open(375, 812, true);
  await p.scrollThrough();
  checks.mobile375 = { ...(await p.eval(common)), bad: p.responses.filter((r) => r.status >= 400).map((r) => r.status + ' ' + r.url), consoleErrors: p.consoleErrors };
  await p.screenshot(path.join(out, 'components-mobile.jpg'));
  await p.eval('window.scrollTo(0,0)'); await sleep(300);
  await p.clipShot(path.join(out, 'header-mobile.jpg'), { x: 0, y: 0, width: 375, height: 560 });
  await p.click('.menu-toggle'); await sleep(500);
  checks.mobile375.menuOpen = await p.eval(`({ navDisplay: getComputedStyle(document.getElementById('site-nav')).display, expanded: document.querySelector('.menu-toggle').getAttribute('aria-expanded'), bodyLocked: document.body.classList.contains('nav-locked'), links: [...document.querySelectorAll('#site-nav a')].filter(a => a.getBoundingClientRect().height > 0).map(a => a.textContent.trim().replace(/\\s+/g, ' ')).slice(0, 20) })`);
  await p.viewportShot(path.join(out, 'header-mobile-menu-open.jpg'));
  await p.eval('document.querySelector("#site-nav").scrollTo(0, 99999)'); await sleep(300);
  await p.viewportShot(path.join(out, 'header-mobile-menu-open-scrolled.jpg'));
  await p.click('.menu-toggle'); await sleep(400);
  checks.mobile375.menuClosedAgain = await p.eval(`getComputedStyle(document.getElementById('site-nav')).display === 'none'`);
  await p.eval('document.querySelector("footer").scrollIntoView()'); await sleep(500);
  await p.elementShot(path.join(out, 'footer-mobile.jpg'), 'footer');
  await p.close();
} finally {
  await chrome.close();
}
fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify(checks, null, 1));
console.log(JSON.stringify(checks, null, 1).slice(0, 4000));
