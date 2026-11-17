// Behaviour tests of the shared header on one page (default: Home), in a headless browser at desktop and mobile sizes:
// mobile menu, Courses dropdown, Live Classes pills for a signed-out and a signed-in visitor. Needs the dev server on :8090.
//   node redesign/tools/test-header.mjs [path]
import { launchChrome } from './cdp.mjs';

const PATH = process.argv[2] || '/';
// "test.local" is mapped to the dev server so main.js behaves as in production (it treats localhost/127.0.0.1 as local development)
const ORIGIN = 'http://test.local:8090';
const chrome = await launchChrome(9344, ['--host-resolver-rules=MAP test.local 127.0.0.1']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  (' + detail + ')' : '')); };

const state = `(() => {
  const vis = (e) => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
  const guest = document.querySelector('[data-lc-guest]');
  const added = [...document.querySelectorAll('[data-lc-added]')];
  const compact = document.querySelector('a[data-lc-compact]');
  const bar = document.querySelector('.bar'), nav = document.querySelector('.nav');
  return {
    guestVisible: vis(guest), guestHref: guest && guest.getAttribute('href'),
    addedCount: added.length, addedText: added.map((a) => a.textContent.trim()), addedHref: added.map((a) => a.getAttribute('href')),
    compactText: compact && compact.textContent.trim(), compactHref: compact && compact.getAttribute('href'),
    coursesPill: [...document.querySelectorAll('.nav-actions a[data-lc-pill]')].map((a) => a.textContent.trim()),
    overflowX: document.documentElement.scrollWidth > innerWidth,
    navRight: Math.round(nav.getBoundingClientRect().right), barInnerRight: Math.round(bar.getBoundingClientRect().right - parseFloat(getComputedStyle(bar).paddingRight)),
    burger: getComputedStyle(document.querySelector('.menu-toggle')).display !== 'none',
  };
})()`;

try {
  // ================= DESKTOP 1440 and 1280, signed out
  for (const w of [1440, 1280]) {
    const p = await chrome.newPage({ width: w, height: 800 });
    await p.goto(ORIGIN + PATH);
    let s = await p.eval(state);
    check(`[${w}] signed out: "Log in" visible and points at the app login`, s.guestVisible && s.guestHref === '/classes/login', s.guestHref);
    check(`[${w}] signed out: no "My Classes" pill`, s.addedCount === 0);
    check(`[${w}] signed out: nav fits inside the header container`, s.navRight <= s.barInnerRight + 1, `nav right ${s.navRight}, container right ${s.barInnerRight}`);
    // dropdown: hover
    await p.hover('.has-menu > a'); await sleep(500);
    const dd = await p.eval(`(() => { const m = document.querySelector('.has-menu > .menu'); const a = document.querySelector('.has-menu > a'); return { visible: getComputedStyle(m).visibility === 'visible' && getComputedStyle(m).opacity === '1', expanded: a.getAttribute('aria-expanded'), items: [...m.querySelectorAll('a')].map((x) => x.getAttribute('href')) }; })()`);
    check(`[${w}] Courses dropdown opens on hover with 5 links`, dd.visible && dd.items.length === 5 && dd.expanded === 'true', dd.items.join(' '));
    await p.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(400);
    const closed = await p.eval(`getComputedStyle(document.querySelector('.has-menu > .menu')).visibility === 'hidden'`);
    check(`[${w}] Escape closes the dropdown`, closed);
    // keyboard: focus the pill
    await p.eval(`document.querySelector('.has-menu > a').focus()`); await sleep(400);
    check(`[${w}] keyboard focus opens the dropdown`, await p.eval(`getComputedStyle(document.querySelector('.has-menu > .menu')).visibility === 'visible'`));
    await p.close();
  }

  // ================= DESKTOP signed in
  for (const w of [1440, 1280]) {
    const p = await chrome.newPage({ width: w, height: 800 });
    await p.goto(ORIGIN + PATH);
    await p.eval(`document.cookie = 'lc_in=1; path=/'`);
    await p.goto(ORIGIN + PATH);
    const s = await p.eval(state);
    check(`[${w}] signed in: "Log in" hidden`, !s.guestVisible);
    check(`[${w}] signed in: "Courses" and "My Classes" pills, My Classes points at the app`, s.addedCount === 1 && s.addedText[0] === 'My Classes' && s.addedHref[0] === '/classes/my-classes' && s.coursesPill.includes('Courses'), JSON.stringify(s.coursesPill) + ' ' + s.addedHref);
    check(`[${w}] signed in: nav still fits inside the header container`, s.navRight <= s.barInnerRight + 1, `nav right ${s.navRight}, container right ${s.barInnerRight}`);
    check(`[${w}] signed in: no horizontal scroll`, !s.overflowX);
    await p.close();
  }

  // ================= MOBILE 375
  let m = await chrome.newPage({ width: 375, height: 812, mobile: true });
  await m.goto(ORIGIN + PATH);
  await m.eval(`document.cookie = 'lc_in=; Max-Age=0; path=/'`); // the earlier signed-in tests left their cookie in this browser
  await m.goto(ORIGIN + PATH);
  let s = await m.eval(state);
  check('[375] burger shown, nav list hidden until opened', s.burger && (await m.eval(`getComputedStyle(document.getElementById('site-nav')).display === 'none'`)));
  check('[375] signed out: compact pill says Courses and links to /courses/', s.compactText === 'Courses' && s.compactHref === '/courses/');
  await m.click('.menu-toggle'); await sleep(500);
  let open = await m.eval(`({ nav: getComputedStyle(document.getElementById('site-nav')).display, expanded: document.querySelector('.menu-toggle').getAttribute('aria-expanded'), locked: document.body.classList.contains('nav-locked'), links: [...document.querySelectorAll('#site-nav > .nav-list a')].length })`);
  check('[375] burger opens the menu (8 links, scroll locked, aria-expanded)', open.nav === 'flex' && open.expanded === 'true' && open.locked && open.links === 8, JSON.stringify(open));
  await m.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(400);
  check('[375] Escape closes the menu', await m.eval(`getComputedStyle(document.getElementById('site-nav')).display === 'none'`));
  await m.click('.menu-toggle'); await sleep(300);
  await m.eval(`document.querySelector('#site-nav a[href="/about"]').addEventListener('click', (e) => e.preventDefault(), { once: true }); document.querySelector('#site-nav a[href="/about"]').click()`); await sleep(400);
  check('[375] tapping a menu link closes the menu', await m.eval(`getComputedStyle(document.getElementById('site-nav')).display === 'none' && !document.body.classList.contains('nav-locked')`));
  await m.close();

  m = await chrome.newPage({ width: 375, height: 812, mobile: true });
  await m.goto(ORIGIN + PATH);
  await m.eval(`document.cookie = 'lc_in=1; path=/'`);
  await m.goto(ORIGIN + PATH);
  s = await m.eval(state);
  check('[375] signed in: compact pill becomes My Classes and links to the app', s.compactText === 'My Classes' && s.compactHref === '/classes/my-classes', s.compactText + ' ' + s.compactHref);
  await m.click('.menu-toggle'); await sleep(500);
  const mi = await m.eval(`({ guest: getComputedStyle(document.querySelector('[data-lc-guest]')).display, added: [...document.querySelectorAll('#site-nav [data-lc-added]')].map((a) => a.textContent.trim()), courses: [...document.querySelectorAll('#site-nav a[data-lc-pill]')].map((a) => a.textContent.trim()) })`);
  check('[375] signed in: menu has Courses + My Classes pills and no Log in', mi.guest === 'none' && mi.added[0] === 'My Classes' && mi.courses.includes('Courses'), JSON.stringify(mi));
  check('[375] signed in: no horizontal scroll', !(await m.eval('document.documentElement.scrollWidth > innerWidth')));
  await m.close();
} finally {
  await chrome.close();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
