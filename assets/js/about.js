/*
 * About page behaviour. Plain JavaScript, no libraries. Everything it animates or toggles is already in the served HTML,
 * so with JavaScript off the whole page is readable (cards and FAQ answers are shown open).
 * With prefers-reduced-motion: reduce there is no rotation, no scroll fade, no count-up, no tilt and no magnetic buttons.
 * The contact form itself is handled by main.js (handleFormSubmission), exactly as on /contact.
 */
(function () {
  'use strict';

  var root = document.querySelector('.abt');
  if (!root) return;

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var finePointer = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  root.classList.add('abt-js');

  function all(sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); }

  /* ---------- rotating role line (the full text is always in the HTML) ---------- */
  var roles = all('.abt-roles > span');
  if (roles.length > 1 && !reduce) {
    var current = 0;
    roles[0].classList.add('is-active');
    window.setInterval(function () {
      roles[current].classList.remove('is-active');
      current = (current + 1) % roles.length;
      roles[current].classList.add('is-active');
    }, 2400);
  }

  /* ---------- open and close helpers (animated with CSS; collapsed parts are inert so Tab skips them) ---------- */
  function setOpen(item, btn, panel, open) {
    item.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { panel.removeAttribute('inert'); panel.removeAttribute('aria-hidden'); }
    else { panel.setAttribute('inert', ''); panel.setAttribute('aria-hidden', 'true'); }
  }

  /* ---------- skill cards: tap or press to open, tilt toward the pointer ---------- */
  all('.abt-card').forEach(function (card) {
    var btn = card.querySelector('.abt-flip');
    var panel = card.querySelector('.abt-more');
    if (!btn || !panel) return;
    setOpen(card, btn, panel, false);
    btn.addEventListener('click', function () { setOpen(card, btn, panel, btn.getAttribute('aria-expanded') !== 'true'); });

    if (finePointer && !reduce) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(800px) rotateX(' + (-y * 5).toFixed(2) + 'deg) rotateY(' + (x * 6).toFixed(2) + 'deg)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    }
  });

  /* ---------- FAQ accordion ---------- */
  var faqs = all('.abt-faq');
  faqs.forEach(function (item) {
    var btn = item.querySelector('.abt-q');
    var panel = item.querySelector('.abt-a-wrap');
    if (!btn || !panel) return;
    setOpen(item, btn, panel, false);
    btn.addEventListener('click', function () { setOpen(item, btn, panel, btn.getAttribute('aria-expanded') !== 'true'); });
  });

  /* ---------- scroll fades, once ---------- */
  var reveals = all('.abt-reveal');
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

  /* ---------- count-up stats, once (the final values are already in the HTML) ---------- */
  var counters = all('.abt-count');
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
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var finalText = el.textContent;
    var start = null;
    function tick(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / 1400, 1);
      if (p < 1) {
        el.textContent = prefix + (target * (1 - Math.pow(1 - p, 3))).toFixed(decimals) + suffix;
        window.requestAnimationFrame(tick);
      } else {
        el.textContent = finalText;
      }
    }
    window.requestAnimationFrame(tick);
  }

  /* ---------- mini-nav: highlight the section being read ---------- */
  var links = all('.abt-minibar a');
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-current'); a.removeAttribute('aria-current'); });
        var a = map[entry.target.id];
        if (a) { a.classList.add('is-current'); a.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- magnetic call-to-action buttons (fine pointers only) ---------- */
  if (finePointer && !reduce) {
    all('.abt-magnet').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) / r.width;
        var y = (e.clientY - (r.top + r.height / 2)) / r.height;
        btn.style.transform = 'translate(' + (x * 8).toFixed(1) + 'px,' + (y * 6).toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
    });
  }

  /* ---------- skill tabs (arrow keys, Home and End; without JavaScript every panel is shown in turn) ---------- */
  all('.abt-tabs').forEach(function (set) {
    var list = set.querySelector('.abt-tablist');
    var tabs = all('[role="tab"]', set);
    if (!list || !tabs.length) return;
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    list.hidden = false;
    function select(i, focus) {
      tabs.forEach(function (t, j) {
        var on = i === j;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        if (panels[j]) panels[j].hidden = !on;
      });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i, false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });
    select(0, false);
  });

  /* ---------- industries: pick one to see what I do there; the matching result cards stay bright ---------- */
  var indWrap = root.querySelector('.abt-ind-wrap');
  if (indWrap) {
    var indList = indWrap.querySelector('.abt-ind-list');
    var indBtns = all('.abt-ind', indWrap);
    var indPanels = all('.abt-ind-panel', indWrap);
    var indStatus = indWrap.querySelector('.abt-ind-status');
    var cards = all('.abt-res');
    if (indList && indBtns.length) {
      indList.hidden = false;
      var pickIndustry = function (slug, fromUser) {
        indBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-ind') === slug ? 'true' : 'false'); });
        indPanels.forEach(function (p) { p.hidden = p.getAttribute('data-ind') !== slug; });
        if (!fromUser) return;
        var hits = cards.filter(function (c) { return (c.getAttribute('data-ind') || '').split(' ').indexOf(slug) >= 0; });
        cards.forEach(function (c) { c.classList.toggle('is-dim', hits.length > 0 && hits.indexOf(c) < 0); });
        var name = indWrap.querySelector('.abt-ind[data-ind="' + slug + '"]').textContent;
        if (indStatus) indStatus.textContent = name + ': ' + (hits.length ? hits.length + (hits.length === 1 ? ' published result' : ' published results') + ' highlighted below.' : 'no published results yet.');
      };
      indBtns.forEach(function (b) { b.addEventListener('click', function () { pickIndustry(b.getAttribute('data-ind'), true); }); });
      pickIndustry(indBtns[0].getAttribute('data-ind'), false);
    }
  }
})();
