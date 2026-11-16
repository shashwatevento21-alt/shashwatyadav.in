// Builds redesign/sample/components.html from the sample source and the real partials (header, footer, floating buttons, head assets).
import fs from 'node:fs';
const dir = new URL('../', import.meta.url);
const rd = (p) => fs.readFileSync(new URL(p, dir), 'utf8').replace(/<!--[\s\S]*?-->\s*/, ''); // drop each partial's leading explanatory comment
let html = fs.readFileSync(new URL('sample/components.src.html', dir), 'utf8');
const headRaw = fs.readFileSync(new URL('partials/head.html', dir), 'utf8').replace(/<!--[\s\S]*?-->\s*/g, '');
html = html.replace('<!--HEAD-->', headRaw.trim())
  .replace('<!--HEADER-->', rd('partials/header.html').trim())
  .replace('<!--FOOTER-->', rd('partials/footer.html').trim())
  .replace('<!--FLOATING-->', rd('partials/floating.html').trim());
fs.writeFileSync(new URL('sample/components.html', dir), html);
console.log('built sample/components.html', html.length, 'bytes');
