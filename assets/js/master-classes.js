/*
 * Master Classes page. Plain JavaScript, no libraries.
 * Each card is plain HTML and works on its own. This script asks the public sessions list (the same one the Courses page uses:
 * no login, no personal data, no cookie) and fills in "Next session" and the seats line for the card whose
 * data-master-course (course address) and data-class-title (exact class title) match the earliest upcoming session.
 * "See dates and enrol" then opens the Courses page with that course already selected.
 */
(function () {
  'use strict';

  var cards = document.querySelectorAll('[data-master-course]');
  if (!cards.length) return;

  var TZ = 'Asia/Kolkata';
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var API_ORIGIN = isLocal ? location.protocol + '//' + location.hostname + ':8000' : '/classes';

  function fmt(date, opts) {
    return new Intl.DateTimeFormat('en-IN', Object.assign({ timeZone: TZ }, opts)).format(date);
  }
  function fmtTime(date) {
    return fmt(date, { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  }
  function text(el, html) { if (el) el.innerHTML = html; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  fetch(API_ORIGIN + '/live-classes/api/sessions', { headers: { 'Accept': 'application/json' } })
    .then(function (res) { if (!res.ok) throw new Error('sessions'); return res.json(); })
    .then(function (data) {
      var now = Date.now();
      var list = (data.sessions || []).map(function (s) {
        var start = new Date(s.startsAt);
        return { s: s, start: start, end: new Date(start.getTime() + s.durationMins * 60000) };
      }).filter(function (x) { return !isNaN(x.start.getTime()) && x.end.getTime() > now; })
        .sort(function (a, b) { return a.start - b.start; });

      Array.prototype.forEach.call(cards, function (card) {
        var slug = card.getAttribute('data-master-course');
        var title = card.getAttribute('data-class-title');
        var next = null;
        for (var i = 0; i < list.length; i++) {
          if (list[i].s.courseSlug === slug && list[i].s.title === title) { next = list[i]; break; }
        }
        var seatsEl = card.querySelector('[data-master-seats]');
        var askEl = card.querySelector('[data-master-ask]');
        var enrol = card.querySelector('[data-master-enrol]');

        text(card.querySelector('[data-master-next]'), next
          ? '<strong>Next session:</strong> ' + esc(fmt(next.start, { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + fmtTime(next.start) + ' IST')
          : '<strong>No session scheduled yet</strong>');

        if (seatsEl) {
          var left = next ? next.s.spotsLeft : null;
          if (next && next.s.isFull) { seatsEl.textContent = 'This session is full'; seatsEl.hidden = false; }
          else if (next && left !== null && left !== undefined) { seatsEl.textContent = left + (left === 1 ? ' seat left' : ' seats left'); seatsEl.hidden = false; }
          else { seatsEl.hidden = true; }
        }
        if (askEl) askEl.hidden = !!next;
        if (enrol && next) enrol.setAttribute('href', '/courses/?course=' + encodeURIComponent(slug) + '#upcoming-classes');
      });
    })
    .catch(function () { /* the cards keep their plain text and the WhatsApp link */ });
})();
