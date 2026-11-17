// Re-targets a page stylesheet to the shared tokens: fonts, colours (green and amber become blue / cyan), then appends the override block for
// the new look. Re-runnable: always starts from the original in redesign/originals-css/.
//   node redesign/tools/retheme-css.mjs about journey
import fs from 'node:fs';
const root = new URL('../../', import.meta.url);
const rd = (p) => fs.readFileSync(new URL(p, root), 'utf8').replace(/\r\n/g, '\n');

const sub = [
  // fonts
  [/'Playfair Display', Georgia, serif|"Playfair Display", Georgia, serif/g, 'var(--font-heading)'],
  [/'Space Mono', monospace|"Space Mono", monospace/g, 'var(--font-heading)'],
  [/'Plus Jakarta Sans', system-ui, sans-serif|"Plus Jakarta Sans", system-ui, sans-serif/g, 'var(--font-body)'],
  // translucent colours
  [/rgba\(\s*21,\s*96,\s*168,/g, 'rgba(0, 88, 213,'], [/rgba\(\s*30,\s*132,\s*73,/g, 'rgba(0, 88, 213,'], [/rgba\(\s*245,\s*158,\s*11,/g, 'rgba(0, 88, 213,'], [/rgba\(\s*15,\s*23,\s*42,/g, 'rgba(0, 30, 84,'],
  // solid colours
  [/#1560A8/gi, 'var(--ss-blue)'], [/#0C447C/gi, 'var(--ss-navy)'], [/#1E8449/gi, 'var(--ss-blue)'], [/#F59E0B/gi, 'var(--ss-blue)'],
  [/#1F2937/gi, 'var(--ss-ink)'], [/#3F3F46/gi, 'var(--ss-slate)'], [/#475569/gi, 'var(--ss-slate)'], [/#F8FAFC/gi, 'var(--ss-mist)'],
  [/#E2E8F0/gi, 'var(--ss-border)'], [/#CBD5E1/gi, 'var(--ss-border)'], [/#EFF6FF/gi, 'var(--ss-mist)'], [/#94A3B8/gi, '#8a93a3'],
  [/#B91C1C/gi, 'var(--ss-error)'], [/#FECACA/gi, 'rgba(180, 35, 24, .35)'],
  // the journey tag colours: one blue family
  [/#FEF3C7/gi, 'var(--ss-mist)'], [/#92400E/gi, 'var(--ss-navy)'], [/#DBEAFE/gi, '#dce9fa'], [/#1E3A8A/gi, 'var(--ss-navy)'], [/#E0F2FE/gi, '#d6f2ff'], [/#075985/gi, '#00507a'],
  [/#EDE9FE/gi, '#e4e9f7'], [/#5B21B6/gi, 'var(--ss-card-dark)'], [/#DCFCE7/gi, '#d6f2ff'], [/#166534/gi, '#00507a'], [/#334155/gi, 'var(--ss-slate)'],
];

for (const name of process.argv.slice(2)) {
  const orig = rd(`redesign/originals-css/${name}.css`);
  let s = orig;
  for (const [re, to] of sub) s = s.replace(re, to);
  const extra = new URL(`redesign/css-overrides/${name}.css`, root);
  if (fs.existsSync(extra)) s += '\n' + fs.readFileSync(extra, 'utf8').replace(/\r\n/g, '\n');
  fs.writeFileSync(new URL(`assets/css/${name}.css`, root), s);
  console.log(name + '.css retargeted:', orig.length, '->', s.length, 'bytes');
}
