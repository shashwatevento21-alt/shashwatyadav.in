// Builds restyled pages from the originals:  node redesign/tools/pages.mjs about services contact ...
// Each entry says which page it is, which nav link is current, and how its content region is produced from the original.
import { convertShell, read, write, part, tag, svgList } from './lib.mjs';

const keep = ({ content }) => content; // the page's own markup is kept exactly; only its stylesheet changes

export const pages = {
  about: { file: 'about.html', active: '/about', content: keep },
};

try { const extra = await import('./pages-more.mjs'); Object.assign(pages, extra.more); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }

const wanted = process.argv.slice(2);
for (const slug of wanted.length ? wanted : Object.keys(pages)) {
  const p = pages[slug];
  if (!p) { console.log('unknown page', slug); continue; }
  const orig = read('redesign/originals/' + p.file);
  write(p.file, convertShell(orig, { active: p.active, content: p.content, head: p.head, extraScripts: p.extraScripts }));
  console.log('built', p.file);
}
