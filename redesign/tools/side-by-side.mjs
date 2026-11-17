// Phase D: side-by-side sheets (before | after | SSVIRAL where a reference shot exists), desktop full-page shots scaled to equal width.
//   node redesign/tools/side-by-side.mjs      (needs serve.mjs on :8090)
import fs from 'node:fs';
import { launchChrome } from './cdp.mjs';

const root = new URL('../', import.meta.url);
const sheets = [
  ['home', 'home-desktop.jpg', true], ['about', 'about-desktop.jpg', true], ['contact', 'contact-desktop.jpg', true],
  ['courses', 'courses-desktop.jpg', false], ['portfolio-case-study', 'portfolio__hospital-multi-treatment-2026-desktop.jpg', false],
  ['skills', 'skills-desktop.jpg', false], ['certifications', 'certifications-desktop.jpg', false],
];
const dir = new URL('screens/side-by-side/', root);
fs.mkdirSync(dir, { recursive: true });
const chrome = await launchChrome(9344, []);
try {
  for (const [name, file, ref] of sheets) {
    const refFile = `ssviral/${name}-desktop.jpg`;
    const hasRef = ref && fs.existsSync(new URL('screens/' + refFile, root));
    const cols = [['Before (old site)', 'before/' + file], ['After (redesign)', 'after/' + file], ...(hasRef ? [['SSVIRAL reference', refFile]] : [])];
    const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;font:600 18px sans-serif;background:#fff"><div style="display:flex;gap:12px;padding:12px">${cols.map(([t, src]) => `<div style="flex:1;min-width:0"><div style="padding:8px 0">${t}</div><img src="/redesign/screens/${src}" style="width:100%;display:block;border:1px solid #ccc"></div>`).join('')}</div>`;
    fs.writeFileSync(new URL(`${name}.html`, dir), html);
    const pg = await chrome.newPage({ width: 1500, height: 900 });
    await pg.goto(`http://127.0.0.1:8090/redesign/screens/side-by-side/${name}.html`, { settle: 1500 });
    await pg.screenshot(new URL(`${name}.jpg`, dir).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
    await pg.close();
    fs.unlinkSync(new URL(`${name}.html`, dir));
    console.log('sheet', name, cols.length, 'columns');
  }
} finally { await chrome.close(); }
