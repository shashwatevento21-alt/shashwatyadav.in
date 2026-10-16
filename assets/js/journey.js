/*
 * "The Journey So Far" (About page): an interactive career map. Plain JavaScript, no libraries.
 * Everything it needs is already in the served HTML. Without this script every card is shown expanded and the controls
 * stay hidden. With it: cards collapse (disclosure buttons), filter chips, a skill lens, shareable #journey-... links,
 * a route line that fills as you scroll, a one-time fade-in and a one-time count-up.
 * With prefers-reduced-motion: reduce there is no scroll animation and no count-up; everything shows at once.
 */
(function () {
  'use strict';

  var root = document.getElementById('journey');
  if (!root) return;

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var chapters = Array.prototype.slice.call(root.querySelectorAll('.journey-chapter'));
  if (!chapters.length) return;

  root.classList.add('journey-js');

  /* ---------- small helpers ---------- */

  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); }
  function tokens(s) { return (s || '').split(/\s+/).filter(Boolean); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /* ---------- cards: disclosure buttons ---------- */

  function setOpen(chapter, open) {
    var btn = chapter.querySelector('.journey-toggle');
    var panel = chapter.querySelector('.journey-panel');
    if (!btn || !panel) return;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.hidden = !open;
    chapter.classList.toggle('is-open', open);
  }

  chapters.forEach(function (chapter) {
    var btn = chapter.querySelector('.journey-toggle');
    if (!btn) return;
    setOpen(chapter, false); // collapsed to start with; the HTML ships expanded so nothing is hidden without JavaScript
    btn.addEventListener('click', function () {
      setOpen(chapter, btn.getAttribute('aria-expanded') !== 'true');
    });
  });

  var controls = root.querySelector('.journey-controls');
  var skillsPanel = root.querySelector('.journey-skills');
  if (controls) controls.hidden = false;
  if (skillsPanel) skillsPanel.hidden = false;

  var expandAll = root.querySelector('[data-expand-all]');
  var collapseAll = root.querySelector('[data-collapse-all]');
  if (expandAll) expandAll.addEventListener('click', function () { chapters.forEach(function (c) { setOpen(c, true); }); });
  if (collapseAll) collapseAll.addEventListener('click', function () { chapters.forEach(function (c) { setOpen(c, false); }); });

  /* ---------- filter chips (non-matching chapters dim but stay readable and reachable) ---------- */

  var chips = $all('.journey-chip');
  var status = controls ? controls.querySelector('.journey-count-status') : null;
  var activeFilter = 'all';

  function matches(chapter, filter) {
    if (filter === 'all') return true;
    var cats = tokens(chapter.getAttribute('data-cats'));
    if (filter === 'webtech') return cats.indexOf('web') >= 0 || cats.indexOf('tech') >= 0;
    return cats.indexOf(filter) >= 0;
  }

  function applyFilter(filter) {
    activeFilter = filter;
    var n = 0;
    chapters.forEach(function (c) {
      var ok = matches(c, filter);
      c.classList.toggle('is-dim', !ok);
      if (ok) n++;
    });
    chips.forEach(function (chip) { chip.setAttribute('aria-pressed', chip.getAttribute('data-filter') === filter ? 'true' : 'false'); });
    if (status) status.textContent = filter === 'all' ? '' : 'Highlighting ' + plural(n, 'chapter', 'chapters') + '. The others are dimmed.';
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () { applyFilter(chip.getAttribute('data-filter')); });
  });

  /* ---------- skill lens ---------- */

  var activeSkill = null;
  var lensStatus = skillsPanel ? skillsPanel.querySelector('.journey-lens-status') : null;

  // the skill tags are plain text in the HTML; with JavaScript they become buttons
  $all('.journey-skilltag').forEach(function (tag) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = tag.className;
    b.setAttribute('data-skill', tag.getAttribute('data-skill'));
    b.setAttribute('aria-pressed', 'false');
    b.textContent = tag.textContent;
    tag.parentNode.replaceChild(b, tag);
  });

  var inlineNote = null;

  function setSkill(slug, origin) {
    activeSkill = slug;
    if (inlineNote && inlineNote.parentNode) inlineNote.parentNode.removeChild(inlineNote);
    inlineNote = null;
    var used = 0;
    var label = '';
    chapters.forEach(function (c) {
      var lit = !!slug && tokens(c.getAttribute('data-skills')).indexOf(slug) >= 0;
      c.classList.toggle('is-lit', lit);
      if (lit) used++;
    });
    $all('button.journey-skilltag').forEach(function (b) {
      var on = !!slug && b.getAttribute('data-skill') === slug;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on && !label && skillsPanel && skillsPanel.contains(b)) label = b.textContent;
    });
    var text = slug ? (label ? label + ': ' : '') + 'Used in ' + plural(used, 'chapter', 'chapters') : '';
    if (lensStatus) lensStatus.textContent = text;
    // tapped inside a card: say it right there too, since the skills panel may be out of sight
    var line = slug && origin ? origin.closest('.journey-tags-line') : null;
    if (line) {
      inlineNote = document.createElement('p');
      inlineNote.className = 'journey-lens-inline';
      inlineNote.textContent = text;
      line.appendChild(inlineNote);
    }
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button.journey-skilltag') : null;
    if (!b) return;
    var slug = b.getAttribute('data-skill');
    setSkill(activeSkill === slug ? null : slug, b);
  });

  /* ---------- open a chapter from the URL hash (#journey-evento) ---------- */

  function fromHash(focus) {
    var id = (window.location.hash || '').replace(/^#/, '');
    if (!id) return;
    var target = null;
    chapters.forEach(function (c) { if (c.id === id) target = c; });
    if (!target) return;
    target.classList.add('is-in');
    setOpen(target, true);
    if (target.scrollIntoView) target.scrollIntoView({ block: 'start', behavior: 'auto' });
    if (focus) {
      var btn = target.querySelector('.journey-toggle');
      if (btn && btn.focus) { try { btn.focus({ preventScroll: true }); } catch (err) { btn.focus(); } }
    }
  }

  /* ---------- the route line fills as you scroll; cards fade in once ---------- */

  var route = root.querySelector('.journey-route');

  function showAll() {
    chapters.forEach(function (c) { c.classList.add('is-in'); });
    if (route) route.style.setProperty('--j-progress', '1');
  }

  if (reduce || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          seen.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    chapters.forEach(function (c) { seen.observe(c); });

    if (route) {
      var ticking = false;
      var update = function () {
        ticking = false;
        var r = route.getBoundingClientRect();
        var mid = window.innerHeight * 0.55;
        var p = (mid - r.top) / Math.max(r.height, 1);
        p = Math.max(0, Math.min(1, p));
        route.style.setProperty('--j-progress', p.toFixed(4));
      };
      var onScroll = function () { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      route.style.setProperty('--j-progress', '0');
      update();
    }
  }

  window.addEventListener('hashchange', function () { fromHash(true); });
  fromHash(false);

  /* ---------- stats: count up once when first seen (final values are already in the HTML) ---------- */

  var counters = $all('.journey-count');
  if (counters.length && !reduce && 'IntersectionObserver' in window) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countObserver.unobserve(entry.target);
        countUp(entry.target);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { countObserver.observe(el); });
  }

  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-target')) || 0;
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var finalText = el.textContent;
    var duration = 1400;
    var start = null;

    function tick(now) {
      if (start === null) start = now;
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      if (progress < 1) {
        el.textContent = prefix + Math.round(target * eased) + suffix;
        window.requestAnimationFrame(tick);
      } else {
        el.textContent = finalText; // always end on exactly what the HTML says
      }
    }
    window.requestAnimationFrame(tick);
  }
})();
