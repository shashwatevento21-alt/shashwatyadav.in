// Re-encodes assets/images/logo.png (2000x535, shown at 150x40) at 450x120 (3x for high-density screens). Same file name and URL.
import fs from 'node:fs';
import { launchChrome } from './cdp.mjs';
const file = new URL('../../assets/images/logo.png', import.meta.url);
const b64 = fs.readFileSync(file).toString('base64');
const chrome = await launchChrome(9345, []);
try {
  const p = await chrome.newPage({ width: 600, height: 300 });
  await p.goto('about:blank', { settle: 100 });
  const out = await p.eval(`new Promise((res) => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = 450; c.height = 120; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, 0, 0, 450, 120); res(c.toDataURL('image/png').split(',')[1]); }; i.src = 'data:image/png;base64,${b64}'; })`);
  fs.copyFileSync(file, new URL('../originals-logo.png', import.meta.url));
  fs.writeFileSync(file, Buffer.from(out, 'base64'));
  console.log('logo bytes', fs.statSync(file).size);
} finally { await chrome.close(); }
