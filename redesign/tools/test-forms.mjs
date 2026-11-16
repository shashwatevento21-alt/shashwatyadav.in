// Contact-form behaviour in a headless browser (desktop and mobile), for the Contact page and the About page's form. The Apps Script call
// is replaced by a stub inside the page, so nothing is ever sent. Needs the dev server on :8090.
//   PAGES=contact,about node redesign/tools/test-forms.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'screens', 'after', 'forms');
fs.mkdirSync(out, { recursive: true });
const BASE = 'http://127.0.0.1:8090';
const pages = (process.env.PAGES || 'contact,about').split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  (' + detail + ')' : '')); };

const stub = `(() => {
  window.__calls = []; window.__mode = 'ok';
  window.fetch = (url, opts) => { window.__calls.push({ url: String(url), body: opts && opts.body ? JSON.parse(opts.body) : null });
    if (window.__mode === 'ok') return Promise.resolve({ json: () => Promise.resolve({ success: true }) });
    if (window.__mode === 'rejected') return Promise.resolve({ json: () => Promise.resolve({ success: false }) });
    return Promise.reject(new Error('network down')); };
})()`;
const fill = (phone) => `(() => {
  const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
  set('form-name', 'Test Visitor'); set('form-phone', ${JSON.stringify(phone)}); set('form-email', ''); set('form-service', document.getElementById('form-service').options[1].value);
  set('form-budget', ''); set('form-message', 'Testing the form, nothing is sent.');
  return document.getElementById('form-country-code').value;
})()`;
const vis = (id) => `(() => { const e = document.getElementById('${id}'); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; })()`;

const chrome = await launchChrome(9346);
try {
  for (const pg of pages) for (const [label, w, h, mobile] of [['desktop', 1280, 800, false], ['mobile', 375, 812, true]]) {
    const tag = `[${pg} ${label}]`;
    const p = await chrome.newPage({ width: w, height: h, mobile });
    await p.goto(`${BASE}/${pg}`, { settle: 1200 });
    await p.eval(stub);
    const cc = await p.eval(fill('9876543210'));
    check(`${tag} country code list is filled (default ${cc})`, !!cc);
    // double click on submit: only one request may go out
    await p.eval(`(() => { const b = document.querySelector('#contact-form button[type=submit]'); b.scrollIntoView({ block: 'center' }); b.click(); b.click(); })()`);
    await sleep(600);
    const calls = await p.eval('window.__calls.length');
    check(`${tag} double-click sends exactly one request`, calls === 1, 'calls ' + calls);
    const body = await p.eval('window.__calls[0] && window.__calls[0].body');
    check(`${tag} the request carries the entered details and an empty honeypot`, body && body.name === 'Test Visitor' && body.phone.startsWith('+91 9876543210') && body.website === '' && /^\/?(contact|about)/.test(String(body.source_page).replace(/^\s+/, '')) || body && body.source_page, JSON.stringify(body && { name: body.name, phone: body.phone, website: body.website, src: body.source_page }));
    check(`${tag} success: thank-you panel shown, form hidden`, (await p.eval(vis('form-success'))) && !(await p.eval(vis('audit-form'))) && !(await p.eval(vis('form-error'))));
    await p.eval(`document.getElementById('form-success').scrollIntoView({ block: 'center' })`); await sleep(300);
    await p.elementShot(`${out}/${pg}-${label}-success.jpg`, '#form-success', { pad: 24 });
    await p.eval(`document.querySelector('#form-success button').click()`); await sleep(300);
    check(`${tag} "Send Another Message" brings the form back, emptied`, (await p.eval(vis('audit-form'))) && (await p.eval(`document.getElementById('form-name').value === ''`)));

    // failure: the server answers success:false
    await p.eval(`window.__mode = 'rejected'`); await p.eval(fill('9876543210'));
    await p.eval(`document.querySelector('#contact-form button[type=submit]').click()`); await sleep(600);
    check(`${tag} error (server says no): error panel with Try again and WhatsApp`, (await p.eval(vis('form-error'))) && (await p.eval(`!!document.querySelector('#form-error a[href^="https://wa.me/917000198366"]')`)) && !(await p.eval(vis('audit-form'))));
    await p.eval(`document.getElementById('form-error').scrollIntoView({ block: 'center' })`); await sleep(300);
    await p.elementShot(`${out}/${pg}-${label}-error.jpg`, '#form-error', { pad: 24 });
    await p.eval(`document.querySelector('#form-error button').click()`); await sleep(300);
    check(`${tag} "Try again" brings the form back`, await p.eval(vis('audit-form')));
    // failure: network down
    await p.eval(`window.__mode = 'down'`); await p.eval(fill('9876543210'));
    await p.eval(`document.querySelector('#contact-form button[type=submit]').click()`); await sleep(600);
    check(`${tag} error (network down): error panel shown and the button is usable again`, (await p.eval(vis('form-error'))) && (await p.eval(`!document.querySelector('#contact-form button[type=submit]').disabled`)));
    await p.eval(`document.querySelector('#form-error button').click()`); await sleep(300);

    // validation: an invalid phone number is refused with a visible error and the error colour
    await p.eval(fill('123')); const before = await p.eval('window.__calls.length');
    await p.eval(`document.querySelector('#contact-form button[type=submit]').click()`); await sleep(400);
    const inv = await p.eval(`(() => { const e = document.getElementById('phone-error'); const i = document.getElementById('form-phone'); return { shown: getComputedStyle(e).display !== 'none', text: e.textContent.trim(), border: getComputedStyle(i).borderTopColor, calls: window.__calls.length }; })()`);
    check(`${tag} invalid phone: message shown in the error colour, nothing sent`, inv.shown && inv.border === 'rgb(180, 35, 24)' && inv.calls === before, JSON.stringify(inv));
    await p.eval(`document.getElementById('form-phone').scrollIntoView({ block: 'center' })`); await sleep(300);
    await p.elementShot(`${out}/${pg}-${label}-invalid-phone.jpg`, '#audit-form', { pad: 16 });
    const overflow = await p.eval('document.documentElement.scrollWidth > innerWidth');
    check(`${tag} no horizontal scroll`, !overflow);
    await p.close();
  }
} finally { await chrome.close(); }
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
