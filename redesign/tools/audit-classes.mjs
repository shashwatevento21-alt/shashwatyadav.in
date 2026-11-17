// Lists the CSS classes a built page uses that no stylesheet it loads defines (leftover Tailwind utilities, typos), and every reference to
// Tailwind. Classes that scripts add at run time are looked up in the page's scripts (as string literals).
//   node redesign/tools/audit-classes.mjs index.html about.html courses/index.html    (no arguments: all 22 pages)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(repo, p), 'utf8');
const all = process.argv.slice(2);
const pagesList = all.length ? all : fs.readdirSync(repo, { recursive: true }).filter((f) => /\.html$/.test(f) && !/^(redesign|wordpress|node_modules|\.git)/.test(f.replace(/\\/g, '/'))).map((f) => f.replace(/\\/g, '/'));

let bad = 0;
for (const page of pagesList) {
  const html = read(page).replace(/<!--[\s\S]*?-->/g, ''); // comments (the switched-off chatbot block) are not live markup
  const cssFiles = [...html.matchAll(/<link rel="stylesheet" href="([^"?]+)/g)].map((m) => m[1].replace(/^\//, ''));
  const jsFiles = [...html.matchAll(/<script src="(\/assets\/js\/[^"?]+)/g)].map((m) => m[1].replace(/^\//, ''));
  let defined = new Set(); let css = '';
  for (const f of cssFiles) { if (!fs.existsSync(path.join(repo, f))) continue; const c = read(f); css += c; for (const m of c.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) defined.add(m[1]); }
  const js = jsFiles.filter((f) => fs.existsSync(path.join(repo, f))).map(read).join('\n') + '\n' + [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  const used = new Map();
  for (const m of html.matchAll(/\bclass="([^"]*)"/g)) for (const t of m[1].split(/\s+/).filter(Boolean)) used.set(t, (used.get(t) || 0) + 1);
  // hook-only classes: no style rule in the original stylesheets either (they only mark elements for scripts or for anchors)
  const HOOKS = new Set(['abt-ind-panels', 'journey-chapters']);
  const esc = (t) => t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const undefinedTokens = [...used.keys()].filter((t) => !defined.has(t) && !HOOKS.has(t) && !new RegExp('(^|[^\\w-])' + esc(t) + '([^\\w-]|$)').test(js));
  const tw = [];
  if (/cdn\.tailwindcss\.com|tailwind-config/.test(html)) tw.push('Tailwind script in <head>');
  if (/fonts\.googleapis\.com/.test(html)) tw.push('Google Fonts link');
  if (/assets\/css\/style\.css/.test(html)) tw.push('old style.css');
  const jsTw = jsFiles.filter((f) => fs.existsSync(path.join(repo, f))).filter((f) => /text-\[|px-\d|py-\d|bg-primary|rounded-(full|xl|2xl)|border-red|text-white\/|items-center|justify-between/.test(read(f)));
  if (jsTw.length) tw.push('Tailwind-style class strings in ' + jsTw.join(', '));
  const status = undefinedTokens.length || tw.length ? 'ISSUES' : 'ok';
  if (status !== 'ok') bad++;
  console.log(`${status.padEnd(6)} ${page}  (${used.size} classes used)${tw.length ? '  [' + tw.join('; ') + ']' : ''}`);
  if (undefinedTokens.length) console.log('       undefined: ' + undefinedTokens.slice(0, 40).join(' ') + (undefinedTokens.length > 40 ? ` … +${undefinedTokens.length - 40}` : ''));
}
console.log(bad ? `\n${bad} page(s) with issues` : '\nall pages clean');
process.exit(bad ? 1 : 0);
