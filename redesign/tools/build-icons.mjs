// Builds assets/icons.svg (one sprite, referenced with <use href="/assets/icons.svg#i-name">). Stroke icons are simple line icons;
// the WhatsApp mark is taken from the current site so it stays identical.
import fs from 'node:fs';
const repo = new URL('../../', import.meta.url);
const index = fs.readFileSync(new URL('index.html', repo), 'utf8');
const wa = (index.match(/<svg class="w-7 h-7 fill-current"[^>]*>\s*<path d="([^"]+)"/) || [])[1];
if (!wa) throw new Error('WhatsApp path not found in index.html');
const stroke = {
  chev: '<path d="m6 9 6 6 6-6"/>',
  arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
};
let out = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n';
for (const [k, v] of Object.entries(stroke)) out += `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>\n`;
out += `<symbol id="i-whatsapp" viewBox="0 0 24 24"><path d="${wa}"/></symbol>\n</svg>\n`;
fs.writeFileSync(new URL('assets/icons.svg', repo), out);
console.log('icons:', Object.keys(stroke).length + 1, 'bytes:', out.length);
