// Rewrites the Tailwind class strings inside assets/js/live-classes.js to the shared theme classes (logic untouched).
//   node redesign/tools/retheme-lc.mjs     (always starts from redesign/originals-js/live-classes.js)
import fs from 'node:fs';
const src = new URL('../originals-js/live-classes.js', import.meta.url);
const dst = new URL('../../assets/js/live-classes.js', import.meta.url);
let s = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
let n = 0;
const sub = (from, to) => { if (!s.includes(from)) throw new Error('missing: ' + from.slice(0, 90)); s = s.split(from).join(to); n++; };

// notices
sub(`ok: 'border-growth-accent/40 bg-growth-accent/10 text-text-heading',
    info: 'border-primary/30 bg-primary/5 text-text-heading',
    error: 'border-red-200 bg-red-50 text-red-700'`, `ok: 'ok',
    info: 'info',
    error: 'err'`);
sub(`noticeEl.className = 'mb-4 rounded-xl border px-4 py-3 text-sm focus:outline-none ' + (NOTICE_STYLE[kind] || NOTICE_STYLE.info);`, `noticeEl.className = 'notice lc-notice ' + (NOTICE_STYLE[kind] || NOTICE_STYLE.info);`);

// account line
sub(`'<span class="text-text-body break-all text-right">Signed in as <strong class="text-text-heading font-semibold">'`, `'<span class="lc-acct-text">Signed in as <strong>'`);
sub(`class="font-semibold text-primary hover:underline">My classes`, `class="lc-acct-link">My classes`);
sub(`data-logout class="text-text-body/80 hover:text-text-heading underline underline-offset-2"`, `data-logout class="lc-acct-btn"`);
sub(`class="inline-flex items-center px-4 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all">Log in`, `class="btn btn-primary btn-sm">Log in`);

// icons (shared .icon style)
sub(`<svg class="w-4 h-4 flex-shrink-0" fill="none"`, `<svg class="icon" aria-hidden="true" focusable="false" fill="none"`);
sub(`<svg class="w-4 h-4 text-growth-accent flex-shrink-0 mt-0.5" fill="none"`, `<svg class="icon" aria-hidden="true" focusable="false" fill="none"`);
sub(`<svg data-chevron class="w-4 h-4 transition-transform" fill="none"`, `<svg data-chevron class="icon" aria-hidden="true" focusable="false" style="transition:transform .2s" fill="none"`);
sub(`<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7`, `<svg class="icon" aria-hidden="true" focusable="false" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7`);

// buttons
sub(`var BTN = 'w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ';
  var BTN_PRIMARY = BTN + 'bg-primary text-white hover:bg-primary-dark';
  var BTN_LABEL = BTN + 'bg-background text-text-body/70 border border-border';`, `var BTN = 'btn btn-block ';
  var BTN_PRIMARY = BTN + 'btn-primary';
  var BTN_LABEL = 'lc-label';`);
sub(`'<span class="' + BTN + 'bg-growth-accent/10 text-growth-accent border border-growth-accent/30">Enrolled ✓</span>'`, `'<span class="lc-enrolled">Enrolled ✓</span>'`);
sub(`'<div class="flex flex-col gap-1.5 w-full">' + head +
          '<a href="'`, `'<div class="lc-stack">' + head +
          '<a href="'`);
sub(`data-join-link class="' + BTN + 'bg-growth-accent text-white hover:brightness-110">Join class`, `data-join-link class="' + BTN + 'btn-primary">Join class`);
sub(`return '<div class="flex flex-col gap-1.5 w-full">' + head +
        '<button type="button" disabled aria-disabled="true" class="' + BTN + 'bg-border/60 text-text-body/60 cursor-not-allowed">`, `return '<div class="lc-stack">' + head +
        '<button type="button" disabled aria-disabled="true" class="' + BTN + 'lc-disabled">`);
sub(`'<span class="text-xs text-text-body/70 text-center">Opens at '`, `'<span class="lc-stamp">Opens at '`);
sub(`class="' + BTN_PRIMARY + ' opacity-70">Enrolling…`, `class="' + BTN_PRIMARY + ' lc-busy">Enrolling…`);
sub(`'<div class="flex flex-col items-stretch gap-1.5 w-full">' +
        '<button type="button" data-signup=`, `'<div class="lc-stack">' +
        '<button type="button" data-signup=`);

// overlap note
sub(`'<p class="mt-2 inline-block rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-xs text-amber-800">Overlaps`, `'<p class="lc-warn">Overlaps`);

// card
sub(`var relClass = rel === 'Live now' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-cta-accent/10 text-amber-700 border-cta-accent/30';`, `var relClass = rel === 'Live now' ? 'live' : 'soon';`);
sub(`'<span class="px-2.5 py-1 rounded-full border text-[11px] font-semibold ' + (cls.spotsLeft <= 5 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-background text-text-body border-border') + '">'`, `'<span class="lc-pill' + (cls.spotsLeft <= 5 ? ' few' : '') + '">'`);
sub(`class="rounded-2xl bg-surface-card border ' + (isNext ? 'border-primary/40 shadow-lg' : 'border-border') + ' overflow-hidden">'`, `class="lc-card' + (isNext ? ' is-next' : '') + '">'`);
sub(`'<div class="p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-5">'`, `'<div class="lc-main">'`);
sub(`'<div class="flex md:flex-col items-center md:justify-center gap-3 md:gap-0 md:w-24 md:flex-shrink-0 rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 md:py-4 md:text-center">'`, `'<div class="lc-date">'`);
sub(`'<span class="text-xs font-mono uppercase tracking-wider text-primary">'`, `'<span class="wd">'`);
sub(`'<span class="font-serif text-3xl md:text-4xl font-bold text-text-heading leading-none md:my-1">'`, `'<span class="day">'`);
sub(`'<span class="text-xs font-semibold text-text-body uppercase tracking-wider">'`, `'<span class="mo">'`);
sub(`'<div class="flex-1 min-w-0">'`, `'<div class="lc-body">'`);
sub(`'<div class="flex flex-wrap items-center gap-2 mb-2">'`, `'<div class="lc-tags">'`);
sub(`'<span class="px-2.5 py-1 rounded-full bg-growth-accent text-white text-[11px] font-semibold">Next class</span>'`, `'<span class="lc-pill next">Next class</span>'`);
sub(`'<span class="px-2.5 py-1 rounded-full border text-[11px] font-semibold ' + relClass + '">'`, `'<span class="lc-pill ' + relClass + '">'`);
sub(`'<p class="text-xs font-semibold text-primary mb-1" data-course-name>'`, `'<p class="lc-course" data-course-name>'`);
sub(`'<h3 class="font-semibold text-lg md:text-xl text-text-heading mb-2">'`, `'<h3 class="lc-topic">'`);
sub(`'<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-body">'`, `'<div class="lc-meta">'`);
sub(`'<span class="inline-flex items-center gap-1.5">'`, `'<span>'`);
sub(`'<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-background border border-border text-xs font-medium">'`, `'<span class="lc-chip">'`);
sub(`'<div class="flex flex-col gap-2.5 md:w-52 md:flex-shrink-0">'`, `'<div class="lc-actions">'`);
sub(`class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-border text-text-heading text-sm font-semibold hover:border-primary/40 hover:text-primary transition-all"><span data-toggle-label>`, `class="btn btn-outline btn-block"><span data-toggle-label>`);
sub(`'<span data-action-slot class="block">'`, `'<span data-action-slot style="display:block">'`);
sub(`hidden class="border-t border-border bg-background px-5 md:px-6 py-5">'`, `hidden class="lc-details">'`);
sub(`'<p class="text-sm text-text-body mb-4">' + esc(cls.summary)`, `'<p>' + esc(cls.summary)`);
sub(`'<h4 class="text-sm font-semibold text-text-heading mb-3">What you\\'ll learn in this class</h4>'`, `'<h4>What you\\'ll learn in this class</h4>'`);
sub(`'<ul class="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">'`, `'<ul class="lc-learn">'`);
sub(`'<li class="flex items-start gap-2 text-sm text-text-body">'`, `'<li>'`);
sub(`'<div class="mt-5 max-w-xs" data-detail-slot>'`, `'<div class="lc-slot" data-detail-slot>'`);

// list states
sub(`'<p class="text-sm text-text-body text-center py-10">Loading classes…</p>'`, `'<p class="lc-note">Loading classes…</p>'`);
sub(`'<p class="text-sm text-red-600 text-center py-10">We couldn`, `'<p class="lc-note err">We couldn`);

// course cards
sub(`var SEE_BTN = 'inline-flex items-center px-3 py-1.5 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all';`, `var SEE_BTN = 'btn btn-primary btn-sm';`);
sub(`'<span class="text-text-body"><span class="font-semibold text-text-heading">Next class:</span> '`, `'<span><strong>Next class:</strong> '`);
sub(`'<span class="text-text-body">No class scheduled yet</span>'`, `'<span>No class scheduled yet</span>'`);
sub(`target="_blank" rel="noopener" class="text-growth-accent font-semibold hover:underline">Ask about the next class`, `target="_blank" rel="noopener">Ask about the next class`);
sub(`card.className = 'group p-6 rounded-2xl bg-surface-card border border-border hover:border-primary/40 transition-all flex flex-col';`, `card.className = 'course-card';`);
sub(`'<h3 class="font-semibold text-lg text-text-heading mb-2">' + esc(master[0].courseName) + '</h3>' +
        '<p class="text-sm text-text-body mb-4 flex-grow">Live master classes, taught on Google Meet.</p>' +
        '<div class="mt-3 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs" data-course-classes></div>'`, `'<h3>' + esc(master[0].courseName) + '</h3>' +
        '<p>Live master classes, taught on Google Meet.</p>' +
        '<div class="course-classes" data-course-classes></div>'`);

// chips
const chip = `class="px-4 py-2 rounded-full border text-sm font-semibold transition-all ' +
        (on ? 'bg-primary text-white border-primary' : 'bg-white text-text-heading border-border hover:border-primary/40') + '">'`;
const chipNew = `class="chip">'`;
sub(chip, chipNew);
sub(`return '<div class="text-center rounded-2xl bg-surface-card border border-border px-6 py-10">' +
      '<p class="text-sm text-text-body mb-4">' + msg + '</p>' +
      '<button type="button" data-filter="all" data-course-reset class="inline-flex items-center px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all">`, `return '<div class="lc-empty card">' +
      '<p>' + msg + '</p>' +
      '<button type="button" data-filter="all" data-course-reset class="btn btn-primary">`);

s = s.split('class="underline font-semibold"').join('class="lc-link"');
fs.writeFileSync(dst, s);
console.log('applied', n, 'replacements');
