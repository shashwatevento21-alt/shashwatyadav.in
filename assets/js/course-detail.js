/*
 * Course detail pages (Google Ads, Meta Ads). Plain JavaScript, no libraries.
 * Everything it works on is already in the served HTML: without JavaScript every class shows its full detail.
 * With it: classes collapse into a timeline you can open one by one, search and filter by phase, jump to a day,
 * a progress line that fills as you scroll, count-up numbers and scroll fades.
 * With prefers-reduced-motion: reduce there is no scroll animation, no count-up and no floating logo.
 */
(function () {
  'use strict';

  var root = document.querySelector('.cd');
  if (!root) return;

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  root.classList.add('cd-js');

  function all(sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); }

  var days = all('.cd-day');

  /* ---------- open and close a class ---------- */
  function setOpen(day, open) {
    var btn = day.querySelector('.cd-toggle');
    var panel = day.querySelector('.cd-panel');
    if (!btn || !panel) return;
    day.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { panel.removeAttribute('inert'); panel.removeAttribute('aria-hidden'); }
    else { panel.setAttribute('inert', ''); panel.setAttribute('aria-hidden', 'true'); }
  }

  days.forEach(function (day, i) {
    setOpen(day, i === 0);                        // the first class starts open, the rest are folded
    var btn = day.querySelector('.cd-toggle');
    if (btn) btn.addEventListener('click', function () { setOpen(day, btn.getAttribute('aria-expanded') !== 'true'); });
  });

  var expandAll = root.querySelector('[data-expand-all]');
  var collapseAll = root.querySelector('[data-collapse-all]');
  if (expandAll) expandAll.addEventListener('click', function () { days.forEach(function (d) { if (!d.hidden) setOpen(d, true); }); });
  if (collapseAll) collapseAll.addEventListener('click', function () { days.forEach(function (d) { setOpen(d, false); }); });

  /* ---------- search and phase filter ---------- */
  var search = root.querySelector('.cd-search');
  var chips = all('.cd-chip');
  var status = root.querySelector('.cd-status');
  var empty = root.querySelector('.cd-empty');
  var phase = 'all';

  function applyFilters() {
    var q = search ? search.value.trim().toLowerCase() : '';
    var shown = 0;
    days.forEach(function (d) {
      var okPhase = phase === 'all' || d.getAttribute('data-phase') === phase;
      var okText = !q || (d.getAttribute('data-search') || '').indexOf(q) >= 0;
      var ok = okPhase && okText;
      d.hidden = !ok;
      if (ok) shown++;
    });
    if (status) status.textContent = (q || phase !== 'all') ? 'Showing ' + shown + ' of ' + days.length + ' classes' : '';
    if (empty) empty.hidden = shown > 0;
    updateProgress();
  }

  if (search) {
    search.addEventListener('input', applyFilters);
    search.addEventListener('keydown', function (e) { if (e.key === 'Escape') { search.value = ''; applyFilters(); } });
  }
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      phase = chip.getAttribute('data-phase');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      applyFilters();
    });
  });

  /* ---------- jump to a day from the numbered links, or from the address (#day-3) ---------- */
  function openFromHash(scroll) {
    var id = (window.location.hash || '').replace(/^#/, '');
    var target = null;
    days.forEach(function (d) { if (d.id === id) target = d; });
    if (!target) return;
    if (target.hidden) {                          // a filter is hiding it: clear the filters first
      if (search) search.value = '';
      phase = 'all';
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-phase') === 'all' ? 'true' : 'false'); });
      applyFilters();
    }
    setOpen(target, true);
    if (scroll && target.scrollIntoView) target.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  }
  all('.cd-jump a').forEach(function (a) {
    a.addEventListener('click', function () { window.setTimeout(function () { openFromHash(false); }, 0); });
  });
  window.addEventListener('hashchange', function () { openFromHash(true); });
  openFromHash(false);

  /* ---------- progress line and current-day highlight ---------- */
  var route = root.querySelector('.cd-route');
  var jumpLinks = all('.cd-jump a');
  var ticking = false;

  function updateProgress() {
    ticking = false;
    if (!route) return;
    var r = route.getBoundingClientRect();
    var p = (window.innerHeight * 0.6 - r.top) / Math.max(r.height, 1);
    p = Math.max(0, Math.min(1, p));
    route.style.setProperty('--cd-progress', reduce ? '1' : p.toFixed(4));
    var current = null;
    days.forEach(function (d) {
      if (d.hidden) return;
      var b = d.getBoundingClientRect();
      if (b.top < window.innerHeight * 0.5) current = d;
    });
    jumpLinks.forEach(function (a) { a.classList.toggle('is-current', !!current && a.getAttribute('href') === '#' + current.id); });
  }
  function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(updateProgress); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateProgress();

  /* ---------- scroll fades, once ---------- */
  var reveals = all('.cd-reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); seen.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { seen.observe(el); });
  }

  /* ---------- count-up numbers, once (the final values are already in the HTML) ---------- */
  var counters = all('.cd-count');
  if (counters.length && !reduce && 'IntersectionObserver' in window) {
    var counted = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        counted.unobserve(entry.target);
        countUp(entry.target);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { counted.observe(el); });
  }

  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-target')) || 0;
    var finalText = el.textContent;
    var start = null;
    window.setTimeout(function () { el.textContent = finalText; }, 1800);   // a background tab can stall animation frames: always end on the real value
    function tick(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / 1200, 1);
      if (p < 1) {
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        window.requestAnimationFrame(tick);
      } else {
        el.textContent = finalText;
      }
    }
    window.requestAnimationFrame(tick);
  }
})();
