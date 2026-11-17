// Content gate: compares an "after" extraction with the baseline. Zero differences are allowed in titles, meta, canonicals, JSON-LD,
// headings, text, links, images and forms. Agreed exceptions (header only): the "Skip to content" link and the Courses dropdown labels
// that used to be built by main.js on hover.
//   node redesign/tools/compare.mjs [after.json] [before.json]     exit code 1 when anything differs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const afterFile = path.resolve(root, process.argv[2] || 'content-after.json');
const beforeFile = path.resolve(root, process.argv[3] || 'content-baseline.json');
const after = JSON.parse(fs.readFileSync(afterFile, 'utf8'));
const before = JSON.parse(fs.readFileSync(beforeFile, 'utf8'));

const ALLOWED_TEXT = ['Skip to content', 'All courses', 'Courses and upcoming live classes', '3-hour live deep dives', 'Search and Demand Gen lead campaigns', 'Lead and engagement campaigns', 'Prompting, building and automation'];
const ALLOWED_LINKS = new Set(['#main|Skip to content', '/courses/|All coursesCourses and upcoming live classes', '/courses/master-classes/|Master Classes3-hour live deep dives', '/courses/google-ads/|Google AdsSearch and Demand Gen lead campaigns', '/courses/meta-ads/|Meta AdsLead and engagement campaigns', '/courses/claude-mastery/|Claude and Claude CodePrompting, building and automation']);
const allowedWords = new Set(ALLOWED_TEXT.join(' ').split(/\s+/).filter(Boolean));
const IGNORED_LINK_RELS = new Set(['stylesheet', 'preload', 'preconnect', 'dns-prefetch', 'modulepreload']);
const TAILWIND = /cdn\.tailwindcss\.com|tailwind-config/;

const norm = (s) => (s == null ? '' : String(s)).replace(/\s+/g, ' ').trim();
const metaKey = (m) => [m.name, m.property, m.httpEquiv, m.charset, m.content].map((x) => (x == null ? '' : x)).join('|');
const seq = (arr, region, f) => arr.filter((x) => x.region === region).map(f);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const firstDiff = (a, b) => { const n = Math.max(a.length, b.length); for (let i = 0; i < n; i++) if (a[i] !== b[i]) return `at ${i}: before=${JSON.stringify(a[i])} after=${JSON.stringify(b[i])}`; return ''; };
const textDiff = (a, b) => { const x = a.split(' '), y = b.split(' '); const n = Math.max(x.length, y.length); for (let i = 0; i < n; i++) if (x[i] !== y[i]) return `first difference at word ${i}: before "${x.slice(Math.max(0, i - 3), i + 6).join(' ')}" | after "${y.slice(Math.max(0, i - 3), i + 6).join(' ')}"`; return ''; };

// The old main.js appended its Courses dropdown to the end of <body> at runtime, so the baseline counts it as "content". Its labels now live in
// the shared header, so they are removed from the baseline's content region before comparing. Local development rewrites the Log in link
// to the app on :8000; that is normalised to the live address.
const MENU_TEXT = 'All courses Courses and upcoming live classes Master Classes 3-hour live deep dives Google Ads Search and Demand Gen lead campaigns Meta Ads Lead and engagement campaigns Claude and Claude Code Prompting, building and automation';
const fixHref = (h) => (h || '').replace(/^https?:\/\/(localhost|127\.0\.0\.1):8000\//, '/classes/');
function normalise(side, isBefore) {
  for (const e of Object.values(side.pages)) {
    for (const l of e.links) l.href = fixHref(l.href);
    if (isBefore) {
      if (e.text.content.endsWith(' ' + MENU_TEXT)) e.text.content = e.text.content.slice(0, -(MENU_TEXT.length + 1));
      // the five old dropdown links (they were appended to the end of <body>, so they sit in the baseline's content region)
      e.links = e.links.filter((l) => !(l.region === 'content' && l.href.startsWith('/courses/') && ALLOWED_LINKS.has(l.href + '|' + l.text) && l.text.length > 14));
    }
  }
}
normalise(after, false); normalise(before, true);
const report = {}; let total = 0;
for (const [p, a] of Object.entries(after.pages)) {
  const b = before.pages[p];
  const d = [];
  const add = (cat, msg) => d.push(`${cat}: ${msg}`);
  if (!b) { report[p] = ['no baseline for this page']; total++; continue; }

  // ---- head / SEO
  if (a.head.title !== b.head.title) add('title', `before "${b.head.title}" after "${a.head.title}"`);
  if (a.head.lang !== b.head.lang) add('lang', `${b.head.lang} -> ${a.head.lang}`);
  const ma = a.head.meta.map(metaKey).sort(), mb = b.head.meta.map(metaKey).sort();
  if (!same(ma, mb)) add('meta', 'meta tags differ: ' + firstDiff(mb, ma));
  const la = a.head.links.filter((l) => !IGNORED_LINK_RELS.has(l.rel)).map((l) => [l.rel, l.href, l.type, l.sizes].join('|')).sort();
  const lb = b.head.links.filter((l) => !IGNORED_LINK_RELS.has(l.rel)).map((l) => [l.rel, l.href, l.type, l.sizes].join('|')).sort();
  if (!same(la, lb)) add('head-links', 'canonical/icon/alternate links differ: ' + firstDiff(lb, la));
  if (!process.env.ALLOW_JSONLD && !same(a.head.jsonLd, b.head.jsonLd)) add('json-ld', 'structured data differs');
  const sa = a.head.scripts.filter((s) => s.inline).map((s) => s.inline).sort(), sb = b.head.scripts.filter((s) => s.inline).map((s) => s.inline).sort();
  if (!same(sa, sb)) add('scripts', 'inline scripts (GTM, page scripts) differ');
  const ea = a.head.scripts.filter((s) => s.src).map((s) => s.src.replace(/\?.*$/, '')), eb = b.head.scripts.filter((s) => s.src && !TAILWIND.test(s.src)).map((s) => s.src.replace(/\?.*$/, ''));
  const missing = eb.filter((s) => !ea.includes(s));
  if (missing.length) add('scripts', 'external scripts missing: ' + missing.join(', '));
  if (a.head.noscriptGtm !== b.head.noscriptGtm) add('gtm', 'GTM noscript differs');
  if (!same(a.chatbotBlocks, b.chatbotBlocks)) add('chatbot', 'commented-out chatbot blocks differ');

  // ---- headings
  for (const r of ['content', 'footer']) {
    // agreed exception (go-live): the three footer column titles are no longer h4 elements (heading order); their text is still compared in the footer text below
    const FOOT_TITLES = ['Quick Links', 'Connect', 'Contact'];
    const bh = b.headings.filter((h) => !(h.region === 'footer' && h.level === 4 && FOOT_TITLES.includes(h.text)));
    const x = seq(bh, r, (h) => 'h' + h.level + ' ' + h.text), y = seq(a.headings, r, (h) => 'h' + h.level + ' ' + h.text);
    if (!same(x, y)) add('headings(' + r + ')', firstDiff(x, y));
  }
  const hh = seq(a.headings, 'header', (h) => h.text); if (hh.length) add('headings(header)', 'new headings in the header: ' + hh.join(' | '));

  // ---- text
  for (const r of ['content', 'footer', 'floating']) if (a.text[r] !== b.text[r]) add('text(' + r + ')', textDiff(b.text[r] || '', a.text[r] || ''));
  const hb = new Set((b.text.header || '').split(' ').filter(Boolean)), ha = new Set((a.text.header || '').split(' ').filter(Boolean));
  const gone = [...hb].filter((w) => !ha.has(w)), extra = [...ha].filter((w) => !hb.has(w) && !allowedWords.has(w));
  if (gone.length) add('text(header)', 'words gone: ' + gone.join(' '));
  if (extra.length) add('text(header)', 'unexpected new words: ' + extra.join(' '));

  // ---- links, images
  const lk = (x) => [x.href, x.text, x.target, x.rel].join('|');
  for (const r of ['content', 'footer', 'floating']) {
    const x = seq(b.links, r, lk), y = seq(a.links, r, lk);
    if (!same(x, y)) add('links(' + r + ')', firstDiff(x, y));
  }
  const hl = (arr) => new Set(arr.filter((l) => l.region === 'header').map((l) => l.href + '|' + l.text));
  const hlb = hl(b.links), hla = hl(a.links);
  const hlaList = [...hla].map((k) => k.split('|'));
  const covered = (k) => { const [h, t] = k.split('|'); return hla.has(k) || hlaList.some(([ah, at]) => ah === h && at.startsWith(t)); };
  const lgone = [...hlb].filter((k) => !covered(k)), lextra = [...hla].filter((k) => !hlb.has(k) && !ALLOWED_LINKS.has(k));
  if (lgone.length) add('links(header)', 'gone: ' + lgone.join(' ; '));
  if (lextra.length) add('links(header)', 'unexpected new: ' + lextra.join(' ; '));
  const im = (x) => [x.src, x.alt, x.width, x.height].join('|');
  for (const r of ['content', 'footer']) {
    const x = seq(b.images, r, (i) => [i.src, i.alt].join('|')), y = seq(a.images, r, (i) => [i.src, i.alt].join('|'));
    if (!same(x, y)) add('images(' + r + ')', firstDiff(x, y));
  }
  const hi = (arr) => new Set(arr.filter((i) => i.region === 'header').map((i) => i.src + '|' + i.alt));
  const igone = [...hi(b.images)].filter((k) => !hi(a.images).has(k));
  if (igone.length) add('images(header)', 'gone: ' + igone.join(' ; '));
  if (!same(a.pictureSources, b.pictureSources)) add('picture', 'picture sources differ');
  if (!same(a.media, b.media)) add('media', 'video/iframe/embed differs');
  if (!same(a.bgImages, b.bgImages)) add('bg-images', 'inline background images differ');

  // ---- forms and integrations
  const fa = a.forms.map((f) => ({ ...f, region: undefined })), fb = b.forms.map((f) => ({ ...f, region: undefined }));
  if (!same(fa, fb)) add('forms', 'form fields/action differ');
  const na = a.network.map((n) => n.method + ' ' + n.url.replace(/^https?:\/\/[^/]+/, '')).sort(), nb = b.network.map((n) => n.method + ' ' + n.url.replace(/^https?:\/\/[^/]+/, '')).sort();
  if (!same(na.filter((x) => /classes|script\.google|chatbot/.test(x)), nb.filter((x) => /classes|script\.google|chatbot/.test(x)))) add('network', 'app/API calls differ: ' + firstDiff(nb, na));
  if (a.mobileOverflowX) add('mobile', 'horizontal scroll at 375 px');

  report[p] = d; total += d.length;
}

let md = `# Content diff report\n\nAfter: \`${path.basename(afterFile)}\` (${after.base}, ${after.when})\nBefore: \`${path.basename(beforeFile)}\` (${before.base}, ${before.when})\n\nPages compared: ${Object.keys(report).length}. **Differences: ${total}**\n\n`;
md += Object.entries(report).map(([p, d]) => `- \`${p}\`: ${d.length ? '**' + d.length + ' difference(s)**\n' + d.map((x) => '    - ' + x).join('\n') : 'identical'}`).join('\n') + '\n';
const outFile = path.join(root, process.env.REPORT || 'diff-report.md');
fs.writeFileSync(outFile, md);
console.log(md);
process.exit(total ? 1 : 0);
