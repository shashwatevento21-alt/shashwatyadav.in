// Page builders (content regions) for the restyle. Each parses the ORIGINAL markup, so text, links, images and form fields are never retyped.
import { tag, grab, svgList, mapClasses, ctaBand, hero } from './lib.mjs';

const unknownCheck = (name, unknown) => { if (unknown.length) throw new Error(`${name}: unmapped classes:\n  ` + unknown.join('\n  ')); };

// ============================================================ Services
function services({ content }) {
  const intro = content.slice(content.indexOf('<!-- SERVICES INTRO -->'), content.indexOf('<!-- SERVICES DETAIL LIST'));
  const detail = content.slice(content.indexOf('<!-- SERVICES DETAIL LIST'), content.indexOf('<!-- INDUSTRIES SERVED -->'));
  const ind = content.slice(content.indexOf('<!-- INDUSTRIES SERVED -->'), content.indexOf('<!-- CTA GET QUOTE -->'));
  const cta = content.slice(content.indexOf('<!-- CTA GET QUOTE -->'));

  const rows = [...detail.matchAll(/<div class="w-20 h-20 [^"]*">\s*(<svg[\s\S]*?<\/svg>)\s*<\/div>\s*<div>\s*<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<ul[^>]*>([\s\S]*?)<\/ul>\s*<div class="mt-4 text-xs[^>]*>([\s\S]*?)<\/div>/g)].map((m) => ({
    svg: svgList(m[1])[0], h3: tag(m[2]), p: tag(m[3]), items: [...m[4].matchAll(/<span>([\s\S]*?)<\/span>/g)].map((x) => tag(x[1])), note: tag(m[5]),
  }));
  if (rows.length !== 5) throw new Error('service rows ' + rows.length);
  const cards = [...ind.matchAll(/<div class="p-6 rounded-2xl bg-background[^"]*">\s*<div class="w-10 h-10[^"]*">\s*(<svg[\s\S]*?<\/svg>)\s*<\/div>\s*<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => ({ svg: svgList(m[1])[0], h3: tag(m[2]), p: tag(m[3]) }));
  if (cards.length !== 9) throw new Error('industry cards ' + cards.length);

  return `<main id="main">
  ${hero({ eyebrow: grab(intro, /<span class="text-xs font-mono text-primary">([\s\S]*?)<\/span>/), h1: grab(intro, /<h1[^>]*>([\s\S]*?)<\/h1>/), lead: grab(intro, /<p class="text-text-body[^>]*>([\s\S]*?)<\/p>/) })}

  <section class="section" id="services">
    <div class="container">
      <div class="svc-list">
${rows.map((r) => `        <div class="card svc-row rv">
          <span class="icon-tile">${r.svg}</span>
          <div>
            <h3>${r.h3}</h3>
            <p>${r.p}</p>
            <ul class="ticks">
${r.items.map((x) => `              <li>${x}</li>`).join('\n')}
            </ul>
            <div class="svc-note">${r.note}</div>
          </div>
        </div>`).join('\n')}
      </div>
    </div>
  </section>

  <section class="section bg-mist">
    <div class="container">
      <div class="section-head rv"><h2 class="h2-lg">${grab(ind, /<h2[^>]*>([\s\S]*?)<\/h2>/)}</h2></div>
      <div class="grid grid-3">
${cards.map((c) => `        <div class="card rv">
          <span class="icon-tile">${c.svg}</span>
          <h3>${c.h3}</h3>
          <p>${c.p}</p>
        </div>`).join('\n')}
      </div>
    </div>
  </section>

  ${ctaBand(cta)}
</main>`;
}

// ============================================================ Contact
const contactRules = [
  [/^(contact-grid|form|field|icon|icon icon-fill)$/, (k) => k], // classes already in the new vocabulary
  [/^block text-sm font-medium text-text-heading mb-2$/, null],
  [/^text-text-body\/50 font-normal$/, 'opt'],
  [/^w-full px-4 py-3 rounded-xl bg-white border border-border text-text-body/, null],
  [/^sm:w-32 px-3 py-3/, 'cc'],
  [/^flex-1 px-4 py-3 rounded-xl/, null],
  [/^flex flex-col sm:flex-row gap-3$/, 'field-row stack-sm'],
  [/^grid md:grid-cols-2 gap-6 mb-6$/, 'form-row'],
  [/^mb-6$/, 'field'],
  [/^hidden mt-2 text-xs text-red-600$/, 'error hidden'],
  [/^w-full py-4 bg-cta-accent/, 'btn btn-primary btn-block'],
  [/^w-5 h-5 group-hover:translate-x-1 transition-transform$/, 'icon'],
  [/^p-8 md:p-10 rounded-2xl bg-surface-card border border-border$/, 'card form-card'],
  [/^hidden p-8 md:p-10 rounded-2xl bg-surface-card border border-border text-center$/, 'card center hidden'],
  [/^hidden p-8 md:p-10 rounded-2xl bg-surface-card border border-red-200 text-center$/, 'card center hidden'],
  [/^w-16 h-16 rounded-full bg-growth-accent\/10 flex/, 'status-icon'],
  [/^w-16 h-16 rounded-full bg-red-50 flex/, 'status-icon err'],
  [/^w-8 h-8 text-growth-accent$/, 'icon'], [/^w-8 h-8 text-red-500$/, 'icon'],
  [/^text-2xl font-semibold text-text-heading mb-2$/, null],
  [/^text-text-body mb-6$/, null],
  [/^px-6 py-2 border border-primary text-primary rounded-full/, 'btn btn-outline'],
  [/^px-6 py-2 bg-cta-accent text-white rounded-full/, 'btn btn-primary'],
  [/^flex flex-col sm:flex-row gap-3 justify-center$/, 'btn-row' ],
  [/^md:col-span-3$/, null], [/^md:col-span-2 space-y-4$/, 'contact-side'],
  [/^group flex items-center gap-4 p-5 rounded-xl bg-surface-card border border-border/, 'contact-card'],
  [/^w-12 h-12 rounded-full bg-(primary|cta-accent) flex/, 'round-icon'],
  [/^w-6 h-6 text-white$/, 'icon'],
  [/^text-sm font-medium text-text-heading$/, 'ct-title'],
  [/^text-xs text-text-body( break-all)?$/, 'ct-sub'],
  [/^p-5 rounded-xl bg-surface-card border border-border border-dashed text-center$/, 'map-ph'],
  [/^text-xs font-mono text-text-body\/60$/, null],
];

function contact({ content }) {
  const sec = content.slice(content.indexOf('<!-- CONTACT'), content.lastIndexOf('</section>') + '</section>'.length);
  const headBlock = sec.match(/<!-- Header -->[\s\S]*?<\/p>\s*<\/div>/)[0];
  const intro = { eyebrow: grab(headBlock, /<span class="text-xs font-mono text-primary">([\s\S]*?)<\/span>/), h1: grab(headBlock, /<h1[^>]*>([\s\S]*?)<\/h1>/), lead: grab(headBlock, /<p class="text-text-body[^>]*>([\s\S]*?)<\/p>/) };
  const gridStart = sec.indexOf('<div class="grid lg:grid-cols-5 gap-8">');
  let grid = sec.slice(gridStart, sec.lastIndexOf('</div>', sec.lastIndexOf('</div>', sec.lastIndexOf('</section>') - 1) - 1)); // the grid element and everything in it
  // rebuild the wrapper, keep the form markup and its ids exactly
  grid = grid.replace('<div class="grid lg:grid-cols-5 gap-8">', '<div class="contact-grid">');
  grid = grid.replace(/<div>\s*(?=<label)/g, '<div class="field">');           // label + control wrappers
  grid = grid.replace('<form id="contact-form"', '<form class="form" id="contact-form"');
  // icons: every inline svg becomes the shared .icon style (their paths stay)
  const svgs = svgList(grid); let i = 0;
  grid = grid.replace(/<svg\b[\s\S]*?<\/svg>/g, () => svgs[i++]);
  const mapped = mapClasses(grid, contactRules);
  unknownCheck('contact', mapped.unknown);
  return `<main id="main">
  ${hero({ ...intro, id: 'contact-cta' })}

  <section class="section bg-mist">
    <div class="container">
      ${mapped.html.trim()}
    </div>
  </section>
</main>`;
}

export const more = {
  services: { file: 'services.html', active: '/services', content: services },
  contact: { file: 'contact.html', active: '/contact', content: contact },
};
