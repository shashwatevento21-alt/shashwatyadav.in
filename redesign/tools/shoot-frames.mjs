// Viewport "frames" of one page as a visitor would see it while scrolling (sticky header and floating buttons in their real place).
//   BASE=http://127.0.0.1:8090 SLUG=home PAGE=/ DIR=after node redesign/tools/shoot-frames.mjs      (PAGE must not be passed as a bare "/" argument in Git Bash)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'http://127.0.0.1:8090';
const SLUG = process.env.SLUG || 'home';
// PAGE uses "~" for "/" (Git Bash rewrites values that start with a slash): PAGE=about, PAGE=courses~google-ads~, PAGE=home
const PAGE = process.env.PAGE === undefined || process.env.PAGE === 'home' ? '/' : '/' + process.env.PAGE.split('~').join('/');
const DIR = path.join(root, 'screens', process.env.DIR || 'after', 'frames');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = await launchChrome(9345);
try {
  for (const [label, w, h, mobile] of [['desktop', 1440, 900, false], ['mobile', 375, 812, true]]) {
    const p = await chrome.newPage({ width: w, height: h, mobile });
    await p.goto(BASE + PAGE, { settle: 1500 });
    await p.scrollThrough();
    const total = await p.eval('document.documentElement.scrollHeight');
    const step = Math.round(h * 0.9);
    let n = 1;
    for (let y = 0; y < total - h + step; y += step, n++) {
      const yy = Math.min(y, total - h);
      await p.eval(`window.scrollTo(0, ${yy})`);
      await sleep(900);
      await p.viewportShot(path.join(DIR, `${SLUG}-${label}-${String(n).padStart(2, '0')}.jpg`), { quality: 82 });
      if (yy >= total - h) break;
    }
    console.log(label, 'height', total, 'frames', n);
    await p.close();
  }
} finally { await chrome.close(); }
