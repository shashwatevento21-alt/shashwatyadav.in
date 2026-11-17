// Live functional checks: Live Classes (sessions list, login link), and one real contact-form submission marked as a test.
import { launchChrome } from './cdp.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const B = 'https://shashwatyadav.com';
const chrome = await launchChrome(9347, []);
try {
  // Live Classes
  const c = await chrome.newPage({ width: 1280, height: 900 });
  await c.goto(B + '/courses/', { settle: 2500 });
  const lc = await c.eval(`({ list: document.getElementById('classes-list').textContent.trim().slice(0, 80), empty: !document.getElementById('classes-empty').classList.contains('hidden'), count: document.getElementById('classes-count').textContent, login: document.getElementById('lc-signup-link') && document.getElementById('lc-signup-link').href, cards: [...document.querySelectorAll('#courses-grid [data-course-classes]')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).join(' / '), headerLogin: [...document.querySelectorAll('[data-lc-login]')].map((a) => a.getAttribute('href')) })`);
  console.log('courses:', JSON.stringify(lc));
  const sess = c.responses ? [...c.responses].filter((r) => /api\/sessions/.test(r.url)).map((r) => r.status + ' ' + r.url) : [];
  console.log('sessions api:', sess.join(' | ') || '(not captured)', '| console errors:', c.consoleErrors ? c.consoleErrors.length : '?');
  await c.close();
  for (const u of ['/classes/live-classes/google', '/classes/login', '/classes/live-classes/api/sessions']) {
    const r = await fetch(B + u, { redirect: 'manual' }); console.log('GET', u, r.status, r.headers.get('location') ? '-> ' + r.headers.get('location').slice(0, 70) : '');
  }
  // contact form: one real submission, clearly marked as a test
  const f = await chrome.newPage({ width: 1280, height: 900 });
  await f.goto(B + '/contact', { settle: 1500 });
  const r = await f.eval(`new Promise((res) => {
    const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
    set('form-name', 'Go-live test (ignore)'); set('form-phone', '9000000000'); set('form-email', 'golive-test@example.com');
    const svc = document.getElementById('form-service'); svc.selectedIndex = 1; svc.dispatchEvent(new Event('change', { bubbles: true }));
    set('form-message', 'Automated go-live test of the contact form. Please ignore.');
    document.getElementById('contact-submit-btn').click();
    setTimeout(() => res({ success: !document.getElementById('form-success').classList.contains('hidden'), error: !document.getElementById('form-error').classList.contains('hidden'), formHidden: document.getElementById('audit-form').classList.contains('hidden') }), 6000);
  })`);
  console.log('contact form:', JSON.stringify(r));
  await f.close();
} finally { await chrome.close(); }
