// Courses page / Live Classes check against a MOCK app (nothing real is touched): the list, filters, course cards, signed-in state,
// logout and the enrol dialog, at desktop and mobile.   node redesign/tools/test-lc.mjs     (starts its own servers on 8091 and 8092)
import http from 'node:http';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { launchChrome } from './cdp.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const day = 86400000, now = Date.now();
const iso = (d, h = 0) => new Date(now + d * day + h * 3600000).toISOString();
const sessions = [
  { id: 1, title: 'Google Ads account setup', summary: 'Set up a lead generation account the right way.', learn: ['Account structure', 'Conversion tracking', 'Budget basics', 'Search campaigns'], courseName: 'Google Ads', courseSlug: 'google-ads', coursePosition: 1, startsAt: iso(1, 2), durationMins: 90, isFull: false, spotsLeft: 3 },
  { id: 2, title: 'Meta Ads creative testing', summary: 'Test creatives without resetting learning.', learn: ['Hooks', 'Formats'], courseName: 'Meta Ads', courseSlug: 'meta-ads', coursePosition: 2, startsAt: iso(3), durationMins: 120, isFull: false, spotsLeft: 20 },
  { id: 3, title: 'Master class: tracking', summary: 'Three hours on tracking.', learn: [], courseName: 'Master Classes', courseSlug: 'master-classes', coursePosition: 3, startsAt: iso(6), durationMins: 180, isFull: true, spotsLeft: 0 },
  { id: 4, title: 'Live right now', summary: 'Already running.', learn: ['One thing'], courseName: 'Google Ads', courseSlug: 'google-ads', coursePosition: 1, startsAt: iso(0, -0.2), durationMins: 90, isFull: false, spotsLeft: null },
];
let signedIn = false;
const app = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  res.setHeader('Content-Type', 'application/json');
  if (u.endsWith('/api/sessions')) return res.end(JSON.stringify({ sessions }));
  if (u.endsWith('/api/me')) return res.end(JSON.stringify(signedIn
    ? { authenticated: true, csrfToken: 't', countries: [{ code: 'IN', dial: '+91', name: 'India' }], user: { email: 'student@example.com', name: 'Test Student' }, mobile: null, enrolled: [4] }
    : { authenticated: false, csrfToken: 't', countries: [{ code: 'IN', dial: '+91', name: 'India' }] }));
  res.statusCode = 404; res.end('{}');
}).listen(8091);
const site = spawn('node', ['redesign/tools/serve.mjs', '8092'], { env: { ...process.env, APP_ORIGIN: 'http://127.0.0.1:8091' }, stdio: 'ignore' });
await sleep(800);

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + extra)); };
const shots = 'redesign/screens/phasec/';
fs.mkdirSync(shots, { recursive: true });
const URL_ = 'http://test.local:8092/courses/';
const chrome = await launchChrome(9341, ['--host-resolver-rules=MAP test.local 127.0.0.1']);
try {
  for (const [label, w, mobile] of [['desktop', 1280, false], ['mobile', 375, true]]) {
    signedIn = false;
    const p = await chrome.newPage({ width: w, height: 900, mobile });
    await p.goto(URL_, { settle: 1800 });
    const g = await p.eval(`(() => ({
      cards: document.querySelectorAll('[data-class-card]').length,
      chips: [...document.querySelectorAll('#lc-courses button')].map((b) => b.textContent),
      next: document.querySelectorAll('.lc-pill.next').length,
      count: document.getElementById('classes-count').textContent,
      overflow: document.documentElement.scrollWidth > innerWidth,
      account: document.getElementById('lc-account').textContent.trim(),
      courseCards: [...document.querySelectorAll('#courses-grid [data-course-classes]')].map((e) => e.textContent.replace(/\\s+/g, ' ').trim()),
      enrolBtns: document.querySelectorAll('[data-signup]').length,
      full: /Class full/.test(document.body.innerText),
    }))()`);
    check(`[${label}] guest: 4 class cards`, g.cards === 4, JSON.stringify(g));
    check(`[${label}] guest: course chips (All + 3)`, g.chips.length === 4, g.chips.join('|'));
    check(`[${label}] guest: exactly one "Next class" tag`, g.next === 1);
    check(`[${label}] guest: Log in link shown, "Class full" shown`, /Log in/.test(g.account) && g.full, g.account);
    check(`[${label}] guest: course cards say Next class / No class scheduled`, /Next class/.test(g.courseCards.join()) && /No class scheduled yet/.test(g.courseCards.join()), g.courseCards.join(' / '));
    check(`[${label}] guest: no horizontal scroll`, !g.overflow);
    await p.eval(`document.querySelector('[data-toggle]').click()`); await sleep(300);
    const open = await p.eval(`(() => { const b = document.querySelector('[data-toggle]'); return b.getAttribute('aria-expanded') + '|' + !document.getElementById(b.getAttribute('data-toggle')).hidden; })()`);
    check(`[${label}] "What you'll learn" opens`, open === 'true|true', open);
    // chip filter: Meta Ads only
    await p.eval(`[...document.querySelectorAll('#lc-courses button')].find((b) => /Meta Ads/.test(b.textContent)).click()`); await sleep(300);
    const filtered = await p.eval(`document.querySelectorAll('[data-class-card]').length + '|' + document.querySelector('#lc-courses [aria-pressed=true]').textContent`);
    check(`[${label}] course chip filters the list`, /^1\|Meta Ads/.test(filtered), filtered);
    await p.eval(`[...document.querySelectorAll('#lc-courses button')][0].click()`); await sleep(200);
    await p.eval(`window.scrollTo(0, document.getElementById('upcoming-classes').offsetTop - 80)`); await sleep(400);
    await p.screenshot(`${shots}courses-${label}-guest.jpg`);
    await p.close();

    // signed in
    signedIn = true;
    const q = await chrome.newPage({ width: w, height: 900, mobile });
    await q.goto(URL_, { settle: 600 });
    await q.eval(`document.cookie = 'lc_in=1; path=/'`);
    await q.goto(URL_, { settle: 1800 });
    const s = await q.eval(`(() => ({
      account: document.getElementById('lc-account').textContent.replace(/\\s+/g, ' ').trim(),
      filters: [...document.querySelectorAll('#lc-filters button')].map((b) => b.textContent),
      enrolled: /Enrolled/.test(document.querySelector('[data-class-card="4"]').textContent),
      join: !!document.querySelector('[data-join-link]'),
      enrolBtn: document.querySelectorAll('[data-enrol]').length,
      pill: !!document.querySelector('[data-lc-added]'),
      overflow: document.documentElement.scrollWidth > innerWidth,
    }))()`);
    check(`[${label}] signed in: account line + My classes`, /Signed in as student@example.com/.test(s.account) && /My classes/.test(s.account), s.account);
    check(`[${label}] signed in: filter chips (3)`, s.filters.length === 3, s.filters.join('|'));
    check(`[${label}] signed in: enrolled class shows Join`, s.enrolled && s.join, JSON.stringify(s));
    check(`[${label}] signed in: Enrol buttons for the other open classes (card + details copy), header pill added`, s.enrolBtn === 4 && s.pill, JSON.stringify(s));
    check(`[${label}] signed in: no horizontal scroll`, !s.overflow);
    // enrol -> mobile-number dialog (no number saved)
    await q.eval(`document.querySelector('[data-enrol]').click()`); await sleep(500);
    const m = await q.eval(`(() => { const d = document.getElementById('enroll-modal'); const r = d.getBoundingClientRect(); return { shown: getComputedStyle(d).display !== 'none' && !d.classList.contains('hidden'), w: Math.round(r.width), name: document.querySelector('[data-user-name]').textContent, input: !!document.getElementById('enroll-mobile'), cc: document.querySelectorAll('[data-country] option').length }; })()`);
    check(`[${label}] enrol dialog opens with the user chip`, m.shown && /Test Student/.test(m.name) && m.input, JSON.stringify(m));
    await q.screenshot(`${shots}courses-${label}-modal.jpg`);
    await q.eval(`document.querySelector('#enroll-modal [data-close]').click()`); await sleep(300);
    check(`[${label}] dialog closes`, await q.eval(`document.getElementById('enroll-modal').classList.contains('hidden')`));
    // log out (POST stubbed in the page)
    await q.eval(`(() => { const f = window.fetch; window.fetch = (u, o) => (o && o.method === 'POST') ? Promise.resolve(new Response('{"csrfToken":"x"}', { status: 200, headers: { 'Content-Type': 'application/json' } })) : f(u, o); })()`);
    await q.eval(`document.querySelector('[data-logout]').click()`); await sleep(600);
    const o = await q.eval(`(() => ({ account: document.getElementById('lc-account').textContent.trim(), pill: !!document.querySelector('[data-lc-added]'), notice: document.getElementById('lc-notice').textContent, nlc: document.querySelectorAll('.nav.lc-in').length }))()`);
    check(`[${label}] logout restores the guest view and header`, /Log in/.test(o.account) && !o.pill && o.nlc === 0 && /logged out/.test(o.notice), JSON.stringify(o));
    await q.screenshot(`${shots}courses-${label}-loggedout.jpg`);
    await q.close();
  }
} finally {
  await chrome.close(); app.close(); site.kill();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
