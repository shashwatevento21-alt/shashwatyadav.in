// Courses hub (the Live Classes page): parse-and-rebuild of the original, every id / data attribute kept, plus the enrol dialog after the footer.
import { tag, grab, svgList, mapClasses, ctaBand } from './lib.mjs';

const unknownCheck = (name, unknown) => { if (unknown.length) throw new Error(`${name}: unmapped classes:\n  ` + unknown.join('\n  ')); };

const hubRules = [
  [/^(section|section bg-mist) scroll-mt$/, (k) => k],
  [/^text-sm text-text-body mb-3$/, null],
  [/^max-w-4xl mx-auto px-4 md:px-8$/, 'container narrow'],
  [/^max-w-6xl mx-auto px-4 md:px-8$/, 'container'],
  [/^flex flex-wrap items-end justify-between gap-2 mb-6$/, 'lc-head'],
  [/^font-serif text-2xl md:text-3xl font-bold text-text-heading$/, null],
  [/^text-sm text-text-body mt-1$/, null],
  [/^flex flex-col items-end gap-1$/, 'lc-side'],
  [/^flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm$/, null],
  [/^inline-flex items-center px-4 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all$/, 'btn btn-primary btn-sm'],
  [/^text-xs font-mono text-text-body\/70$/, 'stamp'],
  [/^grid sm:grid-cols-3 gap-4 mb-8$/, 'steps'],
  [/^flex items-start gap-3 p-4 rounded-2xl bg-surface-card border border-border$/, 'step-card'],
  [/^w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center flex-shrink-0$/, (k) => 'num'],
  [/^text-xs text-text-body mt-1$/, null],
  [/^hidden flex flex-wrap gap-2 mb-3$/, 'hidden lc-chips'],
  [/^hidden flex flex-wrap gap-2 mb-4$/, 'hidden lc-chips'],
  [/^hidden mb-4 rounded-xl border px-4 py-3 text-sm$/, 'hidden notice lc-notice'],
  [/^text-sm text-text-body mb-4$/, 'lc-notice'],
  [/^space-y-4$/, null],
  [/^hidden text-center rounded-2xl bg-surface-card border border-border px-6 py-12$/, 'hidden lc-empty card'],
  [/^font-semibold text-lg text-text-heading mb-2$/, null],
  [/^text-sm text-text-body max-w-md mx-auto mb-5$/, null],
  [/^inline-flex items-center gap-2 px-6 py-2\.5 bg-cta-accent text-white font-semibold rounded-full hover:brightness-95 transition-all text-sm$/, 'btn btn-primary'],
  [/^mb-8 text-center$/, 'section-head center'],
  [/^text-sm text-text-body mt-1 max-w-2xl mx-auto$/, null],
  [/^grid sm:grid-cols-2 lg:grid-cols-3 gap-6$/, 'course-grid'],
  [/^group p-6 rounded-2xl bg-surface-card border border-border hover:border-primary\/40 transition-all flex flex-col$/, 'course-card'],
  [/^block flex-grow$/, 'course-link'],
  [/^w-20 h-20 rounded-2xl bg-background border border-border flex items-center justify-center mb-4$/, 'course-logo'],
  [/^max-w-\[64px\] max-h-\[64px\] object-contain$/, null],
  [/^flex items-center justify-between text-xs text-text-body\/70 pt-2 border-t border-border$/, 'course-foot'],
  [/^text-primary font-semibold hover:translate-x-1 transition-transform inline-flex items-center gap-1$/, 'card-link'],
  [/^w-3 h-3$/, 'icon'],
  [/^mt-3 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs$/, 'course-classes'],
  [/^text-growth-accent font-semibold hover:underline$/, null],
  // the enrol dialog
  [/^hidden fixed inset-0 z-\[120\] items-center justify-center p-4$/, 'hidden modal'],
  [/^absolute inset-0 bg-black\/60 backdrop-blur-sm$/, 'modal-backdrop'],
  [/^relative w-full max-w-md max-h-\[92vh\]/, 'modal-panel'],
  [/^flex items-center justify-between px-6 pt-5 pb-3$/, 'modal-head'],
  [/^font-semibold text-lg text-text-heading$/, null],
  [/^text-text-body\/60 hover:text-text-heading$/, 'modal-close'],
  [/^w-5 h-5$/, 'icon'],
  [/^mx-6 mb-4 px-4 py-3 rounded-xl bg-primary\/5 border border-primary\/15$/, 'modal-class'],
  [/^text-xs text-text-body mt-0\.5$/, 'when'],
  [/^px-6 pb-6$/, 'modal-body'],
  [/^flex items-center gap-3 mb-4 px-3 py-2\.5 rounded-xl bg-background border border-border$/, 'modal-user'],
  [/^min-w-0 flex-1$/, 'who'],
  [/^text-sm font-semibold text-text-heading truncate$/, 'name'],
  [/^text-xs text-text-body truncate$/, 'mail'],
  [/^text-xs font-semibold text-primary hover:underline flex-shrink-0$/, null],
  [/^space-y-3$/, 'form'],
  [/^block text-xs font-semibold text-text-heading mb-1$/, null],
  [/^text-red-600$/, 'req'],
  [/^flex gap-2$/, 'field-row'],
  [/^w-\[9\.5rem\] flex-shrink-0/, 'cc'],
  [/^flex-1 min-w-0 px-4 py-2\.5 rounded-xl/, null],
  [/^hidden text-xs text-red-600 mt-1$/, 'error hidden'],
  [/^text-xs text-text-body\/70 mt-1\.5$/, 'hint'],
  [/^w-full px-5 py-2\.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all$/, 'btn btn-primary btn-block'],
];

function hubMap(html) {
  const m = mapClasses(html, hubRules);
  unknownCheck('courses hub', m.unknown);
  return m.html;
}

export function coursesHub({ content }) {
  const heroBlock = content.match(/<section class="relative pt-40[\s\S]*?<\/section>/)[0];
  const h1 = grab(heroBlock, /<h1[^>]*>([\s\S]*?)<\/h1>/);
  const eyebrow = grab(heroBlock, /<span class="text-xs font-mono text-growth-accent">([\s\S]*?)<\/span>/);
  const ps = [...heroBlock.matchAll(/<p class="([^"]*)">([\s\S]*?)<\/p>/g)].map((m) => tag(m[2]));
  const navLinks = [...heroBlock.matchAll(/<a href="([^"]*)" class="[^"]*">([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1], text: tag(m[2]) }));
  const heroHtml = `<section class="hero">
    <div class="container">
      <p class="eyebrow">${eyebrow}</p>
      <h1>${h1}</h1>
      <p class="lead">${ps[0]}</p>
      <p class="hero-sub">${ps[1].replace(/<strong class="[^"]*">/g, '<strong>')}</p>
      <nav class="btn-row" aria-label="On this page">
        <a class="btn btn-secondary" href="${navLinks[0].href}">${navLinks[0].text}</a>
        <a class="btn btn-ghost-dark" href="${navLinks[1].href}">${navLinks[1].text}</a>
      </nav>
    </div>
  </section>`;
  const ctaRe = /<section class="relative py-16 md:py-20 bg-background overflow-hidden">[\s\S]*?<\/section>/;
  const cta = content.match(ctaRe)[0];
  const ctaP = grab(cta, /<p class="text-sm text-white\/80[^>]*>([\s\S]*?)<\/p>/);
  const ctaHtml = ctaBand(cta).replace('</h2>', `</h2>\n      <p>${ctaP}</p>`);
  let mid = content.slice(content.indexOf('<!-- UPCOMING CLASSES -->'), content.search(ctaRe));
  mid = mid.replace('<span class="block w-10 h-10 text-primary"><svg ', '<span><svg class="icon" ');
  mid = mid.replace('<section id="all-courses" class="relative py-12 md:py-16 bg-background scroll-mt-24">', '<section id="all-courses" class="section bg-mist scroll-mt">');
  mid = mid.replace('<section id="upcoming-classes" class="relative py-12 md:py-16 bg-background scroll-mt-24">', '<section id="upcoming-classes" class="section scroll-mt">');
  // the step titles (h3 inside the how-it-works list) and the dialog's class title share one utility string: handled by position
  mid = mid.replace(/<h3 class="text-sm font-semibold text-text-heading">/g, '<h3>');
  mid = hubMap(mid);
  return `<main id="main">
  ${heroHtml}
  ${mid.trim()}
  ${ctaHtml}
</main>`;
}

export function hubModal(markup) {
  let html = markup.replace(/<div>\s*(?=<label)/g, '<div class="field">');
  html = html.replace(/<svg\b[\s\S]*?<\/svg>/g, (s) => svgList(s)[0]);
  html = html.replace(/<span data-user-initial class="[^"]*">/, '<span data-user-initial class="initial">');
  html = html.replace(/<p data-class-topic class="[^"]*">/, '<p data-class-topic class="topic">');
  return hubMap(html);
}
