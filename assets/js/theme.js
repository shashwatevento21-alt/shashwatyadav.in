// theme.js: behaviour of the shared header (burger panel, Courses dropdown) and the scroll reveal. No libraries, no network calls.
// The header is plain HTML, so with JavaScript off the links all work and the dropdown list is simply not shown on desktop
// (the Courses pill itself still links to /courses/).
(function () {
  'use strict';
  var BREAKPOINT = '(max-width: 1279px)';
  var mq = window.matchMedia ? window.matchMedia(BREAKPOINT) : { matches: false, addEventListener: function () {} };
  var header = document.getElementById('navbar');
  if (!header) return;
  var toggle = header.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');

  // ---- burger / full-width panel (tablet and phone)
  function setNav(open) {
    if (!toggle || !nav) return;
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('nav-locked', open && mq.matches);
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setNav(toggle.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) setNav(false); });
    var onChange = function () { if (!mq.matches) setNav(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }

  // ---- Courses dropdown (desktop): opens on hover and on keyboard focus, closes on Escape or when focus leaves.
  // The pill itself keeps linking to /courses/, so touch, keyboard and no-JavaScript visitors lose nothing.
  var closeTimer = null;
  header.querySelectorAll('.has-menu').forEach(function (wrap) {
    var link = wrap.querySelector(':scope > a');
    var menu = wrap.querySelector(':scope > .menu');
    if (!link || !menu) return;
    link.setAttribute('aria-haspopup', 'true');
    link.setAttribute('aria-expanded', 'false');
    function open() { if (mq.matches) return; clearTimeout(closeTimer); wrap.classList.add('open'); link.setAttribute('aria-expanded', 'true'); }
    function close() { wrap.classList.remove('open'); link.setAttribute('aria-expanded', 'false'); }
    wrap.addEventListener('mouseenter', open);
    wrap.addEventListener('mouseleave', function () { closeTimer = setTimeout(close, 140); });
    wrap.addEventListener('focusin', open);
    wrap.addEventListener('focusout', function (e) { if (!wrap.contains(e.relatedTarget)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); setNav(false); if (wrap.contains(document.activeElement)) link.focus(); } });
  });

  // ---- scroll reveal: only elements that are below the fold when the page loads are hidden, then shown as they come into view
  var items = [].slice.call(document.querySelectorAll('.rv'));
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!items.length || calm || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.remove('rv-wait'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.92) { el.classList.add('rv-wait'); io.observe(el); }
  });
})();
