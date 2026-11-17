// Batch 4: Portfolio (index + 7 case studies), Skills, Certifications, Privacy Policy, Terms. Parse-and-restyle: markup, text, links and images are the
// original's; only the class attributes are mapped from Tailwind utilities to the shared theme classes (+ the closing banner on Certifications).
import { mapClasses, ctaBand, svgList } from './lib.mjs';

const R = (re, to) => [re, to];
const rules = [
  // ---- sections and containers
  R(/^relative pt-40 pb-(6|10|16)( overflow-hidden)? bg-(background|primary|primary\/5 border-b border-border)( text-center)?$/, 'hero'),
  R(/^relative (pt-10 pb-2|pb-8) bg-background$/, 'section tight'),
  R(/^relative (pt-4 pb-16 md:pb-24|py-10 pb-24|py-12 md:py-20|py-16 md:py-24|py-16|pb-20 md:pb-28) bg-background$/, 'section'),
  R(/^relative py-16 bg-surface-card border-y border-border$/, 'section bg-mist'),
  R(/^relative py-16 md:py-24 bg-surface-card border-y border-border scroll-mt-24$/, 'section bg-mist scroll-mt'),
  R(/^max-w-(6xl|5xl) mx-auto px-4 md:px-8( relative z-10 text-center)?$/, 'container'),
  R(/^max-w-4xl mx-auto px-4 md:px-8( text-center)?$/, 'container narrow'),
  R(/^max-w-4xl mx-auto px-4 md:px-8 space-y-10$/, 'container narrow stack'),
  R(/^max-w-3xl mx-auto px-4 md:px-8( relative z-10 text-center)?$/, 'container narrower'),
  R(/^max-w-3xl mx-auto px-4 md:px-8 text-text-body leading-relaxed$/, 'container narrower prose'),
  // ---- hero pieces
  R(/^inline-block px-4 py-2 rounded-full bg-(primary|growth-accent)\/10 border border-(primary|growth-accent)\/(20|30) mb-4$/, null),
  R(/^text-xs font-mono text-(primary|growth-accent)$/, 'eyebrow'),
  R(/^font-serif text-(3xl md:text-5xl|4xl md:text-6xl|4xl md:text-5xl) font-bold text-(text-heading|white) mb-4$/, null),
  R(/^text-text-body max-w-2xl mx-auto( mb-2)?$/, 'lead'),
  R(/^text-lg text-text-body$/, 'lead'),
  R(/^text-white\/80$/, 'lead'),
  R(/^text-xs text-text-body\/60 font-mono$/, 'hero-meta'),
  R(/^text-xs text-text-body\/50 max-w-xl mx-auto mt-4$/, 'hero-note'),
  // ---- headings and copy that the base styles already cover
  R(/^font-serif text-2xl md:text-3xl font-bold text-text-heading mb-(4|8)$/, null),
  R(/^font-serif text-2xl md:text-3xl font-bold text-text-heading text-center mb-(4|10)$/, 'center'),
  R(/^text-center mb-10$/, 'section-head center'),
  R(/^font-serif text-2xl font-bold text-text-heading mt-10 mb-3$/, null),
  R(/^text-lg font-semibold text-text-heading mt-6 mb-2$/, null),
  R(/^font-semibold (text-lg )?text-text-heading( group-hover:text-primary transition-colors)?( mb-(1|3))?$/, null),
  R(/^text-(sm|lg)? ?text-text-body( mb-1)?$/, null),
  R(/^text-text-(body|heading)$/, null),
  R(/^text-sm font-semibold text-text-heading$/, null),
  R(/^mb-(2|3|4)$/, null),
  R(/^text-sm text-text-body\/70 mb-1$/, 'meta-line'),
  R(/^text-xs text-text-body\/(50|60|70)( mb-(1|4))?$/, 'meta-line small'),
  R(/^text-center text-sm text-text-body\/60 max-w-xl mx-auto mb-10$/, 'center-note'),
  R(/^text-text-body\/50$/, null),
  R(/^text-xs font-mono text-text-body\/50$/, null),
  R(/^text-xs font-mono text-growth-accent mb-2$/, 'tag'),
  R(/^text-xs font-mono text-primary mb-3$/, 'eyebrow'),
  R(/^text-primary underline underline-offset-2 hover:text-primary-dark$/, 'text-link'),
  R(/^space-y-1 text-sm text-text-body$/, 'plain-list'),
  R(/^list-disc pl-6 space-y-(1|2) mb-4$/, 'bullets'),
  R(/^space-y-4$/, 'plain-list roomy'),
  R(/^flex items-start gap-3$/, 'check-li'),
  R(/^w-5 h-5 text-growth-accent flex-shrink-0 mt-0\.5$/, 'icon ck'),
  R(/^inline-flex items-center gap-2 text-primary font-semibold text-sm hover:text-primary-dark transition-all$/, 'card-link'),
  R(/^w-4 h-4$/, 'icon'),
  // ---- grids
  R(/^grid sm:grid-cols-2 lg:grid-cols-3 gap-(4|6)$/, (k) => k.endsWith('4') ? 'grid grid-3 tight' : 'grid grid-3'),
  R(/^grid grid-cols-2 lg:grid-cols-3 gap-6$/, 'grid grid-3'),
  R(/^grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6$/, 'grid grid-3'),
  R(/^grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10$/, 'grid grid-4 gap-after'),
  R(/^grid sm:grid-cols-2 gap-6( mb-10 max-w-2xl mx-auto)?$/, (k) => 'grid grid-2' + (/max-w/.test(k) ? ' gap-after narrow-grid' : '')),
  // ---- stats and callouts
  R(/^p-6 rounded-2xl bg-background border border-border text-center$/, 'card stat'),
  R(/^text-3xl font-serif font-bold text-growth-accent mb-1$/, 'n'),
  R(/^text-2xl font-serif font-bold text-growth-accent mb-1$/, 'n sm'),
  R(/^max-w-3xl mx-auto p-5 rounded-xl bg-(growth-accent|primary)\/5 border border-(growth-accent|primary)\/20( mb-6)?$/, 'callout'),
  R(/^aspect-video rounded-xl bg-primary\/10 border border-border flex items-center justify-center$/, 'shot'),
  R(/^p-6 rounded-2xl bg-(surface-card|background) border border-border hover:border-primary\/40 transition-all text-center$/, 'card link-card'),
  // ---- portfolio listing
  R(/^flex flex-wrap justify-center gap-3( mb-10)?$/, 'chips center'),
  R(/^filter-tag active px-4/, 'filter-tag chip active'),
  R(/^filter-tag px-4/, 'filter-tag chip'),
  R(/^portfolio-card group rounded-2xl/, 'portfolio-card post'),
  R(/^aspect-video bg-primary\/10 flex items-center justify-center$/, 'media'),
  R(/^w-10 h-10 text-primary\/40$/, 'icon'),
  R(/^p-6$/, 'body'),
  R(/^inline-block px-2 py-1 rounded-md bg-growth-accent\/10 text-growth-accent text-xs mb-2$/, 'tag'),
  // ---- skills
  R(/^p-6 rounded-2xl bg-surface-card border border-border$/, 'card'),
  R(/^p-6 rounded-2xl bg-background border-2 border-growth-accent\/30 hover:border-growth-accent transition-all$/, 'card accent'),
  R(/^w-12 h-12 rounded-xl bg-(primary|growth-accent) flex items-center justify-center mb-4$/, 'icon-tile'),
  R(/^w-6 h-6 text-white$/, 'icon'),
  R(/^font-semibold text-text-heading mb-(1|4) flex items-center gap-2$/, 'dot-h'),
  R(/^w-2 h-2 rounded-full bg-(primary|growth-accent)$/, 'dot'),
  R(/^flex flex-wrap gap-2$/, 'chips'),
  R(/^px-3 py-1\.5 rounded-full bg-(primary|growth-accent)\/10 text-(primary|growth-accent) text-xs font-medium$/, 'chip static sm'),
  // ---- certifications
  R(/^certificate-card cursor-pointer group sm:col-span-2/, 'certificate-card cert wide'),
  R(/^certificate-card cursor-pointer group/, 'certificate-card cert'),
  R(/^sm:w-80 flex-shrink-0 /, 'cert-img'),
  R(/^flex items-center justify-center bg-background p-4 border-b border-border$/, 'cert-img'),
  R(/^w-full h-auto max-h-(56|72 sm:max-h-64) object-contain drop-shadow-md$/, null),
  R(/^p-6 md:p-8 flex flex-col justify-center$/, 'body grow'),
  R(/^inline-block (w-fit )?px-2 py-0\.5 rounded text-\[10px\]/, 'tag'),
  R(/^hidden fixed inset-0 bg-black\/80 z-\[200\] flex items-center justify-center p-6$/, 'hidden lightbox'),
  R(/^absolute top-6 right-6 text-white hover:text-white\/70 transition-colors$/, 'lightbox-close'),
  R(/^w-8 h-8$/, 'icon'),
  R(/^max-w-full max-h-full rounded-lg shadow-2xl$/, null),
  // ---- privacy / terms / skills extras
  R(/^inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-card border border-border hover:border-primary\/40 text-text-body text-sm transition-all$/, 'chip'),
  R(/^px-4 py-2 rounded-full bg-surface-card border border-border text-text-body text-sm$/, 'chip static'),
  R(/^w-6 h-6 flex items-center justify-center flex-shrink-0$/, 'chip-logo'),
  R(/^max-w-full max-h-full object-contain$/, null),
  R(/^text-sm bg-white border border-border rounded px-1$/, 'kbd'),
  R(/^max-w-xs mx-auto$/, 'narrow-grid'),
];

const ctaRe = /<section class="relative py-20 md:py-24 bg-background overflow-hidden">[\s\S]*?<\/section>/;

export function restyle(name) {
  return ({ content }) => {
    const cta = content.match(ctaRe);
    let html = cta ? content.replace(ctaRe, '@@CTA@@') : content;
    html = html.replace(/<svg\b[\s\S]*?<\/svg>/g, (s) => svgList(s)[0]);
    const m = mapClasses(html, rules);
    if (m.unknown.length) throw new Error(`${name}: unmapped classes:\n  ` + m.unknown.join('\n  '));
    let out = m.html.replace('@@CTA@@', cta ? ctaBand(cta[0]) : '').replace(/<li class="check-li">(\s*)<svg class="icon"/g, '<li class="check-li">$1<svg class="icon ck"');
    // keep the page's own ids; the first section becomes <main>
    return `<main id="main">\n${out.trim()}\n</main>`;
  };
}

export function restyleTail(name) {
  return (markup) => {
    const m = mapClasses(markup.replace(/<svg\b[\s\S]*?<\/svg>/g, (x) => svgList(x)[0]), rules);
    if (m.unknown.length) throw new Error(name + ' tail: unmapped classes:\n  ' + m.unknown.join('\n  '));
    return m.html;
  };
}

