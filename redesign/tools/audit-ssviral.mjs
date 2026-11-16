// Phase A.1: audit ssviral.in (read-only). Screenshots go to redesign/screens/ssviral/, raw data to redesign/ssviral-audit.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome } from './cdp.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const shots = path.join(root, 'screens', 'ssviral');
const extractSrc = fs.readFileSync(path.join(here, 'extract-design.js'), 'utf8');
const BASE = 'https://ssviral.in';
const PAGES = [
  ['home', '/'], ['about', '/about/'], ['services', '/services/'], ['service-google-ads', '/services/google-ads/'],
  ['results', '/results/'], ['contact', '/contact/'], ['blog', '/blog/'],
];

const HOVER_PROPS = ['backgroundColor', 'color', 'transform', 'boxShadow', 'borderTopColor', 'opacity', 'textDecorationLine', 'filter'];
const targets = {
  navLink: 'header nav a',
  primaryButton: 'main a[class*=btn], main button[class*=btn], a[class*=btn]',
  card: 'main [class*=card]',
  footerLink: 'footer li a, footer a',
  heroLink: 'main a',
};

async function hoverDiff(page, selector) {
  const before = await page.eval(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(selector)})].find(x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; }); if (!e) return null; document.querySelectorAll('[data-audit]').forEach(n => n.removeAttribute('data-audit')); e.setAttribute('data-audit', '1'); const s = getComputedStyle(e); return { cls: e.className.toString().replace(/astro-\\w+/g, '').trim().slice(0, 50), text: e.textContent.trim().replace(/\\s+/g, ' ').slice(0, 30), props: ${JSON.stringify(HOVER_PROPS)}.reduce((o, p) => (o[p] = s[p], o), {}), transition: s.transition.slice(0, 100) }; })()`);
  if (!before) return null;
  await page.hover('[data-audit="1"]');
  const after = await page.eval(`(() => { const e = document.querySelector('[data-audit="1"]'); const s = getComputedStyle(e); return ${JSON.stringify(HOVER_PROPS)}.reduce((o, p) => (o[p] = s[p], o), {}); })()`);
  const changed = {};
  for (const p of HOVER_PROPS) if (before.props[p] !== after[p]) changed[p] = `${before.props[p]} -> ${after[p]}`;
  return { element: `${before.cls} "${before.text}"`, transition: before.transition, changed };
}

const chrome = await launchChrome(9333);
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const existing = only && fs.existsSync(path.join(root, 'ssviral-audit.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'ssviral-audit.json'), 'utf8')) : null;
const audit = existing || { site: BASE, when: new Date().toISOString(), pages: {} };
try {
  for (const [slug, p] of PAGES) {
   if (only && !only.includes(slug)) continue;
   try {
    const url = BASE + p;
    const entry = { url };
    // ---------- desktop 1440
    const d = await chrome.newPage({ width: 1440, height: 900 });
    await d.goto(url);
    entry.desktopTop = await d.eval(`(${extractSrc})()`);
    // sticky header behaviour
    const hdrState = `(() => { const h = document.querySelector('header') || document.querySelector('[class*=header]'); if (!h) return null; const s = getComputedStyle(h), r = h.getBoundingClientRect(); const bg = s.backgroundColor; return { cls: h.className.toString().replace(/astro-\\w+/g, '').trim(), rectTop: Math.round(r.top), height: Math.round(r.height), position: s.position, bg, shadow: s.boxShadow, backdrop: s.backdropFilter, transform: s.transform, borderBottom: s.borderBottom }; })()`;
    entry.headerAtTop = await d.eval(hdrState);
    await d.eval('window.scrollTo(0, 1200)'); await new Promise((r) => setTimeout(r, 700));
    entry.headerAfterScroll = await d.eval(hdrState);
    await d.eval('window.scrollTo(0, 0)');
    entry.hover = {};
    if (slug === 'home' || slug === 'services') for (const [k, sel] of Object.entries(targets)) entry.hover[k] = await hoverDiff(d, sel);
    await d.scrollThrough();
    entry.desktopShot = await d.screenshot(path.join(shots, `${slug}-desktop.jpg`));
    entry.desktopHeight = await d.eval('document.documentElement.scrollHeight');
    // forms: field styles on the contact page
    if (slug === 'contact') entry.formFields = await d.eval(`[...document.querySelectorAll('input, textarea, select, button[type=submit]')].filter(e => e.getBoundingClientRect().width > 0).slice(0, 8).map(e => { const s = getComputedStyle(e); return { tag: e.tagName.toLowerCase(), type: e.type, name: e.name, placeholder: e.placeholder, h: Math.round(e.getBoundingClientRect().height), bg: s.backgroundColor, border: s.border, radius: s.borderRadius, padding: s.padding, font: s.fontSize + ' ' + s.fontFamily.split(',')[0] }; })`);
    // focus ring on first input
    if (slug === 'contact') { await d.eval(`document.querySelector('input:not([type=hidden]), textarea')?.focus()`); entry.focusStyle = await d.eval(`(() => { const e = document.activeElement; const s = getComputedStyle(e); return { outline: s.outline, boxShadow: s.boxShadow, borderColor: s.borderTopColor }; })()`); }
    // FAQ interaction (home or service page)
    entry.faq = await d.eval(`(() => { const d = [...document.querySelectorAll('details')]; const b = [...document.querySelectorAll('[aria-expanded]')].filter(x => !x.closest('header')); return { details: d.length, ariaToggles: b.length, firstOpen: d[0] ? d[0].open : null, summaryStyle: d[0] ? (() => { const s = getComputedStyle(d[0].querySelector('summary')); return { size: s.fontSize, weight: s.fontWeight, padding: s.padding, cursor: s.cursor, listStyle: s.listStyleType, display: s.display }; })() : null }; })()`);
    await d.close();

    // ---------- tablet 768 (home and services only)
    if (slug === 'home' || slug === 'services') {
      const t = await chrome.newPage({ width: 768, height: 1024 });
      await t.goto(url); await t.scrollThrough();
      entry.tabletShot = await t.screenshot(path.join(shots, `${slug}-tablet.jpg`));
      entry.tabletHeader = await t.eval(hdrState);
      await t.close();
    }

    // ---------- mobile 375
    const m = await chrome.newPage({ width: 375, height: 812, mobile: true });
    await m.goto(url);
    entry.mobileTop = await m.eval(`(${extractSrc})()`);
    entry.mobileHeaderAtTop = await m.eval(hdrState);
    if (slug === 'home') {
      // open the mobile menu
      const clicked = await m.click('header button.menu-toggle');
      await new Promise((r) => setTimeout(r, 800));
      entry.mobileMenu = { clicked, state: await m.eval(`(() => { const links = [...document.querySelectorAll('a')].filter(a => { const r = a.getBoundingClientRect(); const s = getComputedStyle(a); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && a.closest('header, nav, [class*=menu], [class*=drawer], [class*=mobile]'); }); const panel = [...document.querySelectorAll('nav, [class*=menu], [class*=drawer], [class*=mobile]')].find(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 200 && r.height > 200 && s.visibility !== 'hidden' && s.display !== 'none'; }); const ps = panel ? getComputedStyle(panel) : null; return { bodyOverflow: getComputedStyle(document.body).overflow, burgerExpanded: document.querySelector('[aria-expanded]')?.getAttribute('aria-expanded'), panel: panel ? { cls: panel.className.toString().replace(/astro-\\w+/g, '').slice(0, 60), position: ps.position, bg: ps.backgroundColor, width: Math.round(panel.getBoundingClientRect().width), height: Math.round(panel.getBoundingClientRect().height), transform: ps.transform, opacity: ps.opacity, zIndex: ps.zIndex } : null, visibleLinks: links.slice(0, 20).map(a => a.textContent.trim().replace(/\\s+/g, ' ').slice(0, 28)) }; })()`) };
      await m.viewportShot(path.join(shots, 'home-mobile-menu-open.jpg'));
      await m.eval('document.querySelector("[aria-expanded=true]")?.click()');
      await new Promise((r) => setTimeout(r, 500));
    }
    await m.goto(url);
    await m.scrollThrough();
    entry.mobileShot = await m.screenshot(path.join(shots, `${slug}-mobile.jpg`));
    entry.mobileOverflowX = await m.eval('document.documentElement.scrollWidth > innerWidth');
    await m.close();
    audit.pages[slug] = entry;
    console.log('done', slug, JSON.stringify(entry.desktopShot), JSON.stringify(entry.mobileShot));
   } catch (e) { console.log('FAILED', slug, String(e.stack).slice(0, 500)); audit.pages[slug] = { error: e.message }; }
  }
} finally {
  await chrome.close();
}
fs.writeFileSync(path.join(root, 'ssviral-audit.json'), JSON.stringify(audit, null, 1));
console.log('saved', Object.keys(audit.pages).length, 'pages');
