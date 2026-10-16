(function () {
  'use strict';

  var TZ = 'Asia/Kolkata';
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  // The ONLY place the Laravel app's folder is named. Everything below (API calls, Google sign-in,
  // My Classes links) builds its URLs from API_ORIGIN, so moving the app means changing this one line.
  var APP_BASE_PATH = '/classes';
  var API_ORIGIN = isLocal ? location.protocol + '//' + location.hostname + ':8000' : APP_BASE_PATH;

  // A small "logged in" hint cookie set by the app (value "1", no personal data, same ~30 days as the login).
  // It is only a UI hint: without it this page never calls the app for the visitor (no session is created for
  // anonymous visitors); with it, the app is asked who is signed in and decides everything.
  var HINT = 'lc_in';
  var JOIN_OPENS_MIN = 15;

  var listEl = document.getElementById('classes-list');
  var emptyEl = document.getElementById('classes-empty');
  var countEl = document.getElementById('classes-count');
  var accountEl = document.getElementById('lc-account');
  var filtersEl = document.getElementById('lc-filters');
  var coursesEl = document.getElementById('lc-courses');
  var noticeEl = document.getElementById('lc-notice');
  var modal = document.getElementById('enroll-modal');
  if (!listEl || !modal) return;

  var state = {
    cls: null, csrf: '', countries: [], user: null, mobile: null, enrolled: {}, apiOk: false,
    sessions: [], sessionsLoaded: false, sessionsFailed: false, sessionsAt: 0, busy: {}, filter: 'all',
    // course chip: 'all', a course address (slug), or OTHER for classes that are in no course. courseWanted is ?course= from the link,
    // checked once the classes are known (an unknown one falls back to All).
    course: 'all', courseWanted: new URLSearchParams(window.location.search).get('course')
  };
  var OTHER = '_other';

  /* ---------- hint cookie + sign-up intent ---------- */

  function hasHint() { return new RegExp('(?:^|;\\s*)' + HINT + '=1(?:;|$)').test(document.cookie); }
  function clearHint() { document.cookie = HINT + '=; Max-Age=0; path=/'; }

  var INTENT_KEY = 'lc_intent';
  function saveIntent(id) { try { sessionStorage.setItem(INTENT_KEY, JSON.stringify({ id: String(id), t: Date.now() })); } catch (e) { /* storage blocked */ } }
  function takeIntent() {
    try {
      var raw = sessionStorage.getItem(INTENT_KEY);
      sessionStorage.removeItem(INTENT_KEY);
      var v = raw && JSON.parse(raw);
      // Only a sign-up started on this page, in this tab, in the last 20 minutes can enrol on return. A pasted link cannot.
      return v && Date.now() - v.t < 20 * 60000 ? v.id : null;
    } catch (e) { return null; }
  }

  /* ---------- API ---------- */

  function request(path, method, body) {
    var headers = { 'Accept': 'application/json' };
    if (body) headers['Content-Type'] = 'application/json';
    if (method === 'POST') headers['X-CSRF-TOKEN'] = state.csrf;
    return fetch(API_ORIGIN + '/live-classes/api/' + path, {
      method: method || 'GET',
      credentials: 'include',
      headers: headers,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error(data.message || 'Request failed');
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  function signedOut() {
    state.user = null;
    state.mobile = null;
    state.enrolled = {};
  }

  function applySession(data) {
    state.apiOk = true;
    state.csrf = data.csrfToken;
    state.countries = data.countries || [];
    if (data.authenticated) {
      state.user = data.user;
      state.mobile = data.mobile || null;
      state.enrolled = {};
      (data.enrolled || []).forEach(function (id) { state.enrolled[String(id)] = true; });
    } else {
      signedOut();
      clearHint();
      restoreHeader();
    }
    fillCountries();
  }

  // Only asks the app when the hint cookie says there may be a login.
  function loadSession() {
    if (!hasHint()) { signedOut(); return Promise.resolve(); }
    return request('me').then(applySession).catch(function () { state.apiOk = false; });
  }

  // Public data (no login, no personal data). Never creates a session on the server.
  function loadSessions() {
    return fetch(API_ORIGIN + '/live-classes/api/sessions', { headers: { 'Accept': 'application/json' } })
      .then(function (res) { if (!res.ok) throw new Error('sessions'); return res.json(); })
      .then(function (data) {
        state.sessions = (data.sessions || []).map(toClass);
        state.sessionsFailed = false;
        state.sessionsAt = Date.now();
      })
      .catch(function () { state.sessionsFailed = true; })
      .then(function () { state.sessionsLoaded = true; });
  }

  function toClass(s) {
    var start = new Date(s.startsAt);
    return {
      id: String(s.id),
      topic: s.title,
      summary: s.summary,
      learn: s.learn || [],
      courseName: s.courseName || null,
      courseSlug: s.courseSlug || null,
      coursePosition: typeof s.coursePosition === 'number' ? s.coursePosition : 0,
      startsAt: s.startsAt,
      durationMins: s.durationMins,
      isFull: !!s.isFull,
      spotsLeft: s.spotsLeft,
      start: start,
      end: new Date(start.getTime() + s.durationMins * 60000)
    };
  }

  /* ---------- formatting ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmt(date, opts) {
    return new Intl.DateTimeFormat('en-IN', Object.assign({ timeZone: TZ }, opts)).format(date);
  }

  function fmtTime(date) {
    return fmt(date, { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  }

  function fmtDuration(mins) {
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    if (!h) return m + ' min';
    return h + ' hr' + (m ? ' ' + m + ' min' : '');
  }

  function dayKey(date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);
  }

  function daysFromToday(date) {
    return Math.round((Date.parse(dayKey(date) + 'T00:00:00Z') - Date.parse(dayKey(new Date()) + 'T00:00:00Z')) / 86400000);
  }

  function relativeLabel(cls) {
    var now = Date.now();
    if (now >= cls.start.getTime() && now < cls.end.getTime()) return 'Live now';
    var n = daysFromToday(cls.start);
    if (n <= 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    return 'In ' + n + ' days';
  }

  function whenText(cls) {
    return fmt(cls.start, { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' +
      fmtTime(cls.start) + ' – ' + fmtTime(cls.end) + ' IST';
  }

  /* ---------- notices (success, errors, explanations) ---------- */

  var NOTICE_STYLE = {
    ok: 'border-growth-accent/40 bg-growth-accent/10 text-text-heading',
    info: 'border-primary/30 bg-primary/5 text-text-heading',
    error: 'border-red-200 bg-red-50 text-red-700'
  };

  // html is built from escaped pieces only.
  function notice(kind, html) {
    noticeEl.className = 'mb-4 rounded-xl border px-4 py-3 text-sm focus:outline-none ' + (NOTICE_STYLE[kind] || NOTICE_STYLE.info);
    noticeEl.innerHTML = html;
    noticeEl.classList.remove('hidden');
    noticeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    noticeEl.focus({ preventScroll: true });
  }

  function myClassesUrl() { return API_ORIGIN + '/my-classes'; }
  function joinUrl(id) { return API_ORIGIN + '/my-classes/sessions/' + encodeURIComponent(id) + '/join'; }
  function signInUrl(id) { return API_ORIGIN + '/live-classes/google' + (id ? '?class=' + encodeURIComponent(id) : ''); }

  /* ---------- account area (header of the list) ---------- */

  function renderAccount() {
    var guestLine = document.getElementById('lc-guest-line');
    if (guestLine) guestLine.classList.toggle('hidden', !!state.user);
    if (!accountEl) return;
    if (state.user) {
      accountEl.innerHTML =
        '<span class="text-text-body break-all text-right">Signed in as <strong class="text-text-heading font-semibold">' + esc(state.user.email) + '</strong></span>' +
        '<a href="' + esc(myClassesUrl()) + '" class="font-semibold text-primary hover:underline">My classes &rarr;</a>' +
        '<button type="button" data-logout class="text-text-body/80 hover:text-text-heading underline underline-offset-2">Not you? Log out</button>';
    } else {
      accountEl.innerHTML = '<a id="lc-signup-link" href="' + esc(signInUrl()) + '" class="inline-flex items-center px-4 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all">Log in</a>';
    }
  }

  if (accountEl) {
    accountEl.addEventListener('click', function (e) {
      if (e.target.closest('[data-logout]')) logout();
    });
  }

  function logout() {
    request('logout', 'POST').then(function (data) {
      state.csrf = data.csrfToken;
    }).catch(function () { /* the app is unreachable: still forget locally */ }).then(function () {
      signedOut();
      clearHint();
      restoreHeader();
      renderAccount();
      renderList();
      notice('info', 'You have been logged out.');
    });
  }

  // main.js turned the header's "Courses" pill into "Courses" and "My Classes" while signed in; put it back.
  function restoreHeader() {
    document.querySelectorAll('a[data-lc-added]').forEach(function (a) { a.parentNode.removeChild(a); });
    document.querySelectorAll('[data-lc-guest]').forEach(function (el) { el.classList.remove('hidden'); });
    document.querySelectorAll('a[data-lc-swapped]').forEach(function (a) {
      var label = null;
      Array.prototype.forEach.call(a.children, function (c) { if (c.tagName === 'SPAN' && c.textContent.trim()) label = c; });
      if (label) label.innerHTML = a.getAttribute('data-lc-swapped');
      a.setAttribute('href', '/courses/');
      if (a.getAttribute('data-lc-dot') && a.firstElementChild) { a.firstElementChild.classList.remove('hidden'); a.removeAttribute('data-lc-dot'); }
      if (a.getAttribute('data-lc-class')) { a.className = a.getAttribute('data-lc-class'); a.removeAttribute('data-lc-class'); }
      a.removeAttribute('data-lc-swapped');
    });
  }

  /* ---------- class list ---------- */

  function upcoming() {
    var now = Date.now();
    return state.sessions
      .filter(function (c) { return !isNaN(c.start.getTime()) && c.end.getTime() > now; })
      .sort(function (a, b) { return a.start - b.start; });
  }

  var ICON_CLOCK = '<svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 2"/></svg>';
  var ICON_CHECK = '<svg class="w-4 h-4 text-growth-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
  var ICON_CHEVRON = '<svg data-chevron class="w-4 h-4 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>';
  var ICON_ARROW = '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>';

  var BTN = 'w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ';
  var BTN_PRIMARY = BTN + 'bg-primary text-white hover:bg-primary-dark';
  var BTN_LABEL = BTN + 'bg-background text-text-body/70 border border-border';

  // The state of one class for this visitor. Pure UI: the server re-checks everything on every request, and the
  // Meet link is never in this page: the green button is a link to the app, which checks the enrolment and the window.
  function actionHtml(cls) {
    var now = Date.now();
    var id = esc(cls.id);

    if (now >= cls.end.getTime()) return '<span class="' + BTN_LABEL + '">Class ended</span>';

    if (state.enrolled[cls.id]) {
      var opens = new Date(cls.start.getTime() - JOIN_OPENS_MIN * 60000);
      var head = '<span class="' + BTN + 'bg-growth-accent/10 text-growth-accent border border-growth-accent/30">Enrolled ✓</span>';
      if (now >= opens.getTime()) {
        return '<div class="flex flex-col gap-1.5 w-full">' + head +
          '<a href="' + esc(joinUrl(cls.id)) + '" target="_blank" rel="noopener noreferrer" data-join-link class="' + BTN + 'bg-growth-accent text-white hover:brightness-110">Join class ' + ICON_ARROW + '</a></div>';
      }
      return '<div class="flex flex-col gap-1.5 w-full">' + head +
        '<button type="button" disabled aria-disabled="true" class="' + BTN + 'bg-border/60 text-text-body/60 cursor-not-allowed">You can join ' + JOIN_OPENS_MIN + ' minutes before class</button>' +
        '<span class="text-xs text-text-body/70 text-center">Opens at ' + esc(fmtTime(opens)) + ' IST</span></div>';
    }

    if (cls.isFull) return '<span class="' + BTN_LABEL + '">Class full</span>';

    if (state.busy[cls.id]) return '<button type="button" disabled class="' + BTN_PRIMARY + ' opacity-70">Enrolling…</button>';

    if (!state.user) {
      return '<div class="flex flex-col items-stretch gap-1.5 w-full">' +
        '<button type="button" data-signup="' + id + '" class="' + BTN_PRIMARY + '">Continue with Google to enrol ' + ICON_ARROW + '</button></div>';
    }

    return '<button type="button" data-enrol="' + id + '" class="' + BTN_PRIMARY + '">Enrol ' + ICON_ARROW + '</button>';
  }

  // A class that shares time with one the student is enrolled in: a note, never a block.
  function overlapNote(cls) {
    if (!state.user || state.enrolled[cls.id]) return '';
    for (var i = 0; i < state.sessions.length; i++) {
      var e = state.sessions[i];
      if (e.id !== cls.id && state.enrolled[e.id] && e.start < cls.end && cls.start < e.end) {
        return '<p class="mt-2 inline-block rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-xs text-amber-800">Overlaps with ' + esc(e.topic) + ' at ' + esc(fmtTime(e.start)) + ' IST</p>';
      }
    }
    return '';
  }

  function cardHtml(cls) {
    var isNext = classes.length > 0 && classes[0].id === cls.id;
    var rel = relativeLabel(cls);
    var relClass = rel === 'Live now' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-cta-accent/10 text-amber-700 border-cta-accent/30';
    var detailsId = 'details-' + cls.id;
    var seats = cls.spotsLeft !== null && cls.spotsLeft !== undefined && !cls.isFull
      ? '<span class="px-2.5 py-1 rounded-full border text-[11px] font-semibold ' + (cls.spotsLeft <= 5 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-background text-text-body border-border') + '">' + cls.spotsLeft + (cls.spotsLeft === 1 ? ' seat left' : ' seats left') + '</span>'
      : '';
    return '' +
      '<article data-class-card="' + esc(cls.id) + '" class="rounded-2xl bg-surface-card border ' + (isNext ? 'border-primary/40 shadow-lg' : 'border-border') + ' overflow-hidden">' +
        '<div class="p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-5">' +
          '<div class="flex md:flex-col items-center md:justify-center gap-3 md:gap-0 md:w-24 md:flex-shrink-0 rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 md:py-4 md:text-center">' +
            '<span class="text-xs font-mono uppercase tracking-wider text-primary">' + esc(fmt(cls.start, { weekday: 'short' })) + '</span>' +
            '<span class="font-serif text-3xl md:text-4xl font-bold text-text-heading leading-none md:my-1">' + esc(fmt(cls.start, { day: 'numeric' })) + '</span>' +
            '<span class="text-xs font-semibold text-text-body uppercase tracking-wider">' + esc(fmt(cls.start, { month: 'short' })) + '</span>' +
          '</div>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="flex flex-wrap items-center gap-2 mb-2">' +
              (isNext ? '<span class="px-2.5 py-1 rounded-full bg-growth-accent text-white text-[11px] font-semibold">Next class</span>' : '') +
              '<span class="px-2.5 py-1 rounded-full border text-[11px] font-semibold ' + relClass + '">' + esc(rel) + '</span>' +
              seats +
            '</div>' +
            (cls.courseName ? '<p class="text-xs font-semibold text-primary mb-1" data-course-name>' + esc(cls.courseName) + '</p>' : '') +
            '<h3 class="font-semibold text-lg md:text-xl text-text-heading mb-2">' + esc(cls.topic) + '</h3>' +
            '<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-body">' +
              '<span class="inline-flex items-center gap-1.5">' + ICON_CLOCK + esc(fmtTime(cls.start) + ' – ' + fmtTime(cls.end) + ' IST') + '</span>' +
              '<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-background border border-border text-xs font-medium">' + esc(fmtDuration(cls.durationMins)) + '</span>' +
            '</div>' +
            overlapNote(cls) +
          '</div>' +
          '<div class="flex flex-col gap-2.5 md:w-52 md:flex-shrink-0">' +
            '<button type="button" data-toggle="' + esc(detailsId) + '" aria-expanded="false" aria-controls="' + esc(detailsId) + '" class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-border text-text-heading text-sm font-semibold hover:border-primary/40 hover:text-primary transition-all"><span data-toggle-label>What you\'ll learn</span> ' + ICON_CHEVRON + '</button>' +
            '<span data-action-slot class="block">' + actionHtml(cls) + '</span>' +
          '</div>' +
        '</div>' +
        '<div id="' + esc(detailsId) + '" hidden class="border-t border-border bg-background px-5 md:px-6 py-5">' +
          '<p class="text-sm text-text-body mb-4">' + esc(cls.summary) + '</p>' +
          (cls.learn.length
            ? '<h4 class="text-sm font-semibold text-text-heading mb-3">What you\'ll learn in this class</h4>' +
              '<ul class="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">' +
                cls.learn.map(function (item) {
                  return '<li class="flex items-start gap-2 text-sm text-text-body">' + ICON_CHECK + '<span>' + esc(item) + '</span></li>';
                }).join('') +
              '</ul>'
            : '') +
          '<div class="mt-5 max-w-xs" data-detail-slot>' + actionHtml(cls) + '</div>' +
        '</div>' +
      '</article>';
  }

  var classes = [];

  function renderList() {
    if (!state.sessionsLoaded) {
      listEl.innerHTML = '<p class="text-sm text-text-body text-center py-10">Loading classes…</p>';
      emptyEl.classList.add('hidden');
      return;
    }
    if (state.sessionsFailed) {
      listEl.innerHTML = '<p class="text-sm text-red-600 text-center py-10">We couldn\'t load the class schedule. Please refresh the page, or message me on WhatsApp.</p>';
      emptyEl.classList.add('hidden');
      if (countEl) countEl.textContent = '';
      return;
    }
    // Keep any open "What you'll learn" panels open across a redraw.
    var open = {};
    listEl.querySelectorAll('[data-toggle][aria-expanded="true"]').forEach(function (b) { open[b.getAttribute('data-toggle')] = true; });
    classes = upcoming();
    renderCourses();
    renderFilters();
    var shown = courseScoped().filter(function (c) {
      if (!state.user || state.filter === 'all') return true;
      return state.filter === 'enrolled' ? !!state.enrolled[c.id] : !state.enrolled[c.id];
    });
    listEl.innerHTML = shown.length || !classes.length ? shown.map(cardHtml).join('') : emptyFilterHtml();
    Object.keys(open).forEach(function (id) {
      var btn = listEl.querySelector('[data-toggle="' + id + '"]');
      if (btn) toggleDetails(btn, true);
    });
    emptyEl.classList.toggle('hidden', classes.length > 0);
    if (countEl) {
      var scoped = courseScoped(), where = state.course === 'all' ? '' : (state.course === OTHER ? ' in Other classes' : ' in ' + courseLabel(state.course));
      countEl.textContent = !classes.length ? '' : shown.length === scoped.length
        ? scoped.length + (scoped.length === 1 ? ' upcoming class' : ' upcoming classes') + where
        : 'Showing ' + shown.length + ' of ' + scoped.length + ' upcoming classes' + where;
    }
    renderCourseCards();
  }

  /* ---------- course cards (the "All courses" grid on the same page; filled from the same sessions request as the list) ---------- */

  var courseGridEl = document.getElementById('courses-grid');
  var SEE_BTN = 'inline-flex items-center px-3 py-1.5 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all';

  // A card whose course has an upcoming class shows the next date (IST) and a "See classes" button. Any other card says
  // "No class scheduled yet" next to its "Ask about the next class" WhatsApp link. Without JavaScript (or if the sessions
  // could not load) the cards simply keep the WhatsApp link they were written with.
  function fillCourseCard(card, items, ask) {
    var box = card.querySelector('[data-course-classes]');
    if (!box) return;
    if (!box.getAttribute('data-ask')) { var a0 = box.querySelector('a'); box.setAttribute('data-ask', a0 ? a0.getAttribute('href') : (ask || '#')); }
    var slug = card.getAttribute('data-course');
    if (items && items.length) {
      var next = items[0];
      box.innerHTML = '<span class="text-text-body"><span class="font-semibold text-text-heading">Next class:</span> ' +
        esc(fmt(next.start, { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + fmtTime(next.start) + ' IST') + '</span>' +
        '<button type="button" data-see-course="' + esc(slug) + '" class="' + SEE_BTN + '">See classes</button>';
    } else {
      box.innerHTML = '<span class="text-text-body">No class scheduled yet</span>' +
        '<a href="' + esc(box.getAttribute('data-ask')) + '" target="_blank" rel="noopener" class="text-growth-accent font-semibold hover:underline">Ask about the next class</a>';
    }
  }

  function renderCourseCards() {
    if (!courseGridEl || !state.sessionsLoaded || state.sessionsFailed) return;
    var bySlug = {};
    classes.forEach(function (c) { if (c.courseSlug) (bySlug[c.courseSlug] = bySlug[c.courseSlug] || []).push(c); });   // `classes` is sorted by start
    courseGridEl.querySelectorAll('article[data-course]').forEach(function (card) { fillCourseCard(card, bySlug[card.getAttribute('data-course')]); });

    // "Master Classes" has no page of its own: its card shows only while the sessions JSON has that course.
    var master = bySlug['master-classes'], existing = courseGridEl.querySelector('article[data-course="master-classes"]');
    if (master && master.length && !existing) {
      var card = document.createElement('article');
      card.setAttribute('data-course', 'master-classes');
      card.className = 'group p-6 rounded-2xl bg-surface-card border border-border hover:border-primary/40 transition-all flex flex-col';
      card.innerHTML = '<h3 class="font-semibold text-lg text-text-heading mb-2">' + esc(master[0].courseName) + '</h3>' +
        '<p class="text-sm text-text-body mb-4 flex-grow">Live master classes, taught on Google Meet.</p>' +
        '<div class="mt-3 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs" data-course-classes></div>';
      courseGridEl.appendChild(card);
      fillCourseCard(card, master, 'https://wa.me/917000198366');
    } else if (!master && existing && existing.getAttribute('data-dynamic') !== null) {
      existing.parentNode.removeChild(existing);
    }
    if (master && master.length && existing === null) { var made = courseGridEl.querySelector('article[data-course="master-classes"]'); if (made) made.setAttribute('data-dynamic', '1'); }
  }

  /* ---------- course chips (everyone; the public list stays the same for all visitors) ---------- */

  // The groups that have at least one upcoming class: courses in position order, then "Other classes" for the rest.
  function courseGroups() {
    var map = {}, list = [], other = 0;
    classes.forEach(function (c) {
      if (!c.courseSlug) { other++; return; }
      if (!map[c.courseSlug]) { map[c.courseSlug] = { slug: c.courseSlug, name: c.courseName, position: c.coursePosition, count: 0 }; list.push(map[c.courseSlug]); }
      map[c.courseSlug].count++;
    });
    list.sort(function (a, b) { return (a.position - b.position) || a.name.localeCompare(b.name); });
    return { courses: list, other: other };
  }

  function courseLabel(slug) {
    var g = courseGroups().courses.filter(function (c) { return c.slug === slug; })[0];
    return g ? g.name : slug;
  }

  function courseScoped() {
    if (state.course === 'all') return classes;
    return classes.filter(function (c) { return state.course === OTHER ? !c.courseSlug : c.courseSlug === state.course; });
  }

  // Keeps the address in step with the chip so the link can be shared. Only ?course= is touched; "All classes" removes it.
  function writeCourseToUrl() {
    try {
      var url = new URL(window.location.href);
      if (state.course === 'all') url.searchParams.delete('course'); else url.searchParams.set('course', state.course);
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    } catch (e) { /* old browser: the chips still work, the address just stays as it is */ }
  }

  function renderCourses() {
    if (!coursesEl) return;
    var g = courseGroups(), groups = g.courses.length + (g.other ? 1 : 0);

    // The link's ?course= is checked once, as soon as there are classes to check it against.
    if (state.courseWanted !== null && classes.length) {
      var wanted = state.courseWanted;
      state.courseWanted = null;
      var known = wanted === OTHER ? (g.other > 0 && g.courses.length > 0) : g.courses.some(function (c) { return c.slug === wanted; });
      state.course = known ? wanted : 'all';
      if (!known) writeCourseToUrl();
    }

    // One group (or none) means nothing to choose between: no row, and any chip choice is cleared.
    if (groups <= 1 || !g.courses.length) {
      coursesEl.classList.add('hidden'); coursesEl.classList.remove('flex'); coursesEl.innerHTML = '';
      if (state.course !== 'all') { state.course = 'all'; writeCourseToUrl(); }
      return;
    }

    // A chosen course that no longer has an upcoming class (it just finished) falls back to All.
    if (state.course !== 'all' && state.course !== OTHER && !g.courses.some(function (c) { return c.slug === state.course; })) { state.course = 'all'; writeCourseToUrl(); }
    if (state.course === OTHER && !g.other) { state.course = 'all'; writeCourseToUrl(); }

    var chips = [['all', 'All classes', classes.length]].concat(g.courses.map(function (c) { return [c.slug, c.name, c.count]; }));
    if (g.other) chips.push([OTHER, 'Other classes', g.other]);
    coursesEl.innerHTML = chips.map(function (c) {
      var on = state.course === c[0];
      return '<button type="button" data-course="' + esc(c[0]) + '" aria-pressed="' + on + '" class="px-4 py-2 rounded-full border text-sm font-semibold transition-all ' +
        (on ? 'bg-primary text-white border-primary' : 'bg-white text-text-heading border-border hover:border-primary/40') + '">' + esc(c[1]) + ' (' + c[2] + ')</button>';
    }).join('');
    coursesEl.classList.remove('hidden');
    coursesEl.classList.add('flex');
  }

  /* ---------- filter chips (signed-in students only; the public list itself is never personalised) ---------- */

  var CHIPS = [['all', 'All upcoming'], ['enrolled', 'Enrolled'], ['notenrolled', 'Not enrolled yet']];

  function filterCounts() {
    var scoped = courseScoped(), all = scoped.length, mine = scoped.filter(function (c) { return !!state.enrolled[c.id]; }).length;
    return { all: all, enrolled: mine, notenrolled: all - mine };
  }

  function renderFilters() {
    if (!filtersEl) return;
    if (!state.user || !classes.length) { filtersEl.classList.add('hidden'); filtersEl.classList.remove('flex'); state.filter = 'all'; return; }
    var n = filterCounts();
    filtersEl.innerHTML = CHIPS.map(function (c) {
      var on = state.filter === c[0];
      return '<button type="button" data-filter="' + c[0] + '" aria-pressed="' + on + '" class="px-4 py-2 rounded-full border text-sm font-semibold transition-all ' +
        (on ? 'bg-primary text-white border-primary' : 'bg-white text-text-heading border-border hover:border-primary/40') + '">' + c[1] + ' (' + n[c[0]] + ')</button>';
    }).join('');
    filtersEl.classList.remove('hidden');
    filtersEl.classList.add('flex');
  }

  function emptyFilterHtml() {
    var scopedNote = state.course !== 'all' ? ' in this group' : '';
    var msg = state.filter === 'enrolled'
      ? 'You haven\'t enrolled in any upcoming class' + scopedNote + ' yet.'
      : 'You\'re enrolled in every upcoming class' + scopedNote + '. New dates are added regularly.';
    return '<div class="text-center rounded-2xl bg-surface-card border border-border px-6 py-10">' +
      '<p class="text-sm text-text-body mb-4">' + msg + '</p>' +
      '<button type="button" data-filter="all" data-course-reset class="inline-flex items-center px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all">Show all upcoming classes</button></div>';
  }

  document.addEventListener('click', function (e) {
    var seeCourse = e.target.closest('[data-see-course]');
    if (seeCourse) {
      // "See classes" on a course card: pick that course's chip and bring the list into view.
      state.course = seeCourse.getAttribute('data-see-course');
      writeCourseToUrl();
      renderList();
      var target = document.getElementById('upcoming-classes');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    var courseChip = e.target.closest('button[data-course]');
    if (courseChip) { state.course = courseChip.getAttribute('data-course'); writeCourseToUrl(); renderList(); return; }
    var chip = e.target.closest('[data-filter]');
    if (chip) {
      state.filter = chip.getAttribute('data-filter');
      if (chip.hasAttribute('data-course-reset') && state.course !== 'all') { state.course = 'all'; writeCourseToUrl(); } // "Show all upcoming classes" clears both
      renderList();
      return;
    }
    var more = e.target.closest('[data-show-all]');
    if (more) { state.filter = 'all'; renderList(); listEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); e.preventDefault(); }
  });

  // Redraw only the buttons (so expanded details and focus stay put).
  function refreshButtons() {
    classes.forEach(function (cls) {
      var card = listEl.querySelector('[data-class-card="' + cls.id + '"]');
      if (!card) return;
      var html = actionHtml(cls);
      card.querySelectorAll('[data-action-slot], [data-detail-slot]').forEach(function (el) { el.innerHTML = html; });
    });
  }

  function findClass(id) {
    for (var i = 0; i < classes.length; i++) if (classes[i].id === String(id)) return classes[i];
    return null;
  }

  function toggleDetails(toggle, forceOpen) {
    var panel = document.getElementById(toggle.getAttribute('data-toggle'));
    var open = forceOpen === true ? true : panel.hasAttribute('hidden');
    panel.toggleAttribute('hidden', !open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.querySelector('[data-toggle-label]').textContent = open ? 'Hide details' : 'What you\'ll learn';
    toggle.querySelector('[data-chevron]').style.transform = open ? 'rotate(180deg)' : '';
  }

  listEl.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-toggle]');
    if (toggle) { toggleDetails(toggle); return; }

    var signup = e.target.closest('[data-signup]');
    if (signup) { startSignup(signup.getAttribute('data-signup')); return; }

    var enrolBtn = e.target.closest('[data-enrol]');
    if (enrolBtn) startEnrol(findClass(enrolBtn.getAttribute('data-enrol')));
  });

  /* ---------- sign up, then enrol ---------- */

  function startSignup(id) {
    saveIntent(id);
    window.location.href = signInUrl(id);
  }

  // One click for a signed-in student with a mobile number on file. Asks for the number only if it is missing.
  function startEnrol(cls) {
    if (!cls) return;
    if (!state.user) { startSignup(cls.id); return; }
    if (!state.mobile) { openMobileModal(cls); return; }
    enrolNow(cls, {});
  }

  function setBusy(id, on) {
    if (on) state.busy[id] = true; else delete state.busy[id];
    refreshButtons();
  }

  function enrolNow(cls, extra, retried) {
    setBusy(cls.id, true);
    return request('enrol', 'POST', Object.assign({ session_id: Number(cls.id) }, extra || {}))
      .then(function (data) {
        state.mobile = data.mobile || state.mobile;
        state.enrolled[cls.id] = true;
        setBusy(cls.id, false);
        closeModal();
        notice('ok',
          '<strong>You\'re enrolled in ' + esc(cls.topic) + '.</strong> ' + esc(whenText(cls)) + '. ' +
          (data.emailSent ? 'A confirmation is on its way to <strong>' + esc(state.user.email) + '</strong>. ' : 'We couldn\'t queue the confirmation email, but your seat is saved. ') +
          'Your <strong>Join class</strong> button appears here and in <a class="underline font-semibold" href="' + esc(myClassesUrl()) + '">My classes</a> ' + JOIN_OPENS_MIN + ' minutes before the class starts. ' +
          '<a href="#classes-list" data-show-all class="underline font-semibold">Browse more classes</a>');
        renderFilters();
        return true;
      })
      .catch(function (err) {
        setBusy(cls.id, false);
        return handleEnrolError(err, cls, extra, retried);
      });
  }

  function handleEnrolError(err, cls, extra, retried) {
    var data = err.data || {};

    // The 2-hour login lapsed (or this tab is old): ask the app again. The 30-day cookie usually signs the student
    // straight back in, so retry once instead of sending them to the sign-in again.
    if ((err.status === 401 || err.status === 419) && !retried) {
      document.cookie = HINT + '=1; path=/'; // let loadSession ask the app even if the hint was dropped
      return loadSession().then(function () {
        renderAccount();
        if (state.user) return enrolNow(cls, extra, true);
        refreshButtons();
        notice('info', 'Please continue with Google to enrol in <strong>' + esc(cls.topic) + '</strong>. It takes a few seconds.');
        return false;
      });
    }
    if (err.status === 401 || err.status === 419) {
      signedOut(); clearHint(); restoreHeader(); renderAccount(); refreshButtons();
      notice('info', 'Your session ended. Please continue with Google to enrol.');
      return false;
    }
    if (err.status === 409 && data.code === 'already_enrolled') {
      state.enrolled[cls.id] = true;
      closeModal(); refreshButtons();
      notice('info', 'You\'re already enrolled in <strong>' + esc(cls.topic) + '</strong>. Find it in <a class="underline font-semibold" href="' + esc(myClassesUrl()) + '">My classes</a>.');
      return false;
    }
    if (err.status === 409 && data.code === 'full') {
      cls.isFull = true;
      closeModal(); refreshButtons();
      notice('error', 'Sorry, <strong>' + esc(cls.topic) + '</strong> is full. Other upcoming classes are listed below.');
      return false;
    }
    if (err.status === 409 && data.code === 'removed') {
      closeModal(); refreshButtons();
      notice('error', 'You were removed from this class by the organiser. Please contact <a class="underline font-semibold" href="mailto:support@shashwatyadav.in">support@shashwatyadav.in</a>.');
      return false;
    }
    if (err.status === 422 && data.code === 'closed') {
      closeModal();
      notice('error', esc(data.message || 'This class is no longer available.') + ' Here are the classes that are open.');
      loadSessions().then(function () { renderList(); });
      return false;
    }
    if (err.status === 422 && data.errors) {
      var first = (data.errors.mobile || data.errors.country_code || [])[0] || data.message || 'Please check your details.';
      if (!modal.classList.contains('hidden')) setError('mobile', first); else { state.mobile = null; openMobileModal(cls); setError('mobile', first); }
      return false;
    }
    if (err.status === 403) {
      closeModal();
      notice('error', 'Please verify your email address first, or continue with Google.');
      return false;
    }
    closeModal();
    notice('error', 'Something went wrong, and you are not enrolled yet. Please try again in a moment.');
    return false;
  }

  /* ---------- mobile number (asked once) ---------- */

  function q(sel) { return modal.querySelector(sel); }

  function setError(name, message) {
    var el = q('[data-error="' + name + '"]');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('hidden', !message);
  }

  function normaliseMobile(raw) {
    var digits = String(raw).replace(/\D+/g, '');
    return digits.charAt(0) === '0' ? digits.slice(1) : digits;
  }

  function currentCountry() {
    var code = q('[data-country]').value;
    for (var i = 0; i < state.countries.length; i++) if (state.countries[i].code === code) return state.countries[i];
    return null;
  }

  function updateMobileHint() {
    var c = currentCountry();
    q('[data-mobile-hint]').textContent = c ? c.name + ': ' + c.digits + ', without the country code.' : '';
  }

  function fillCountries() {
    var select = q('[data-country]');
    if (!state.countries.length) return;
    select.innerHTML = state.countries.map(function (c) {
      return '<option value="' + esc(c.code) + '">' + esc(c.name) + ' (' + esc(c.code) + ')</option>';
    }).join('');
    updateMobileHint();
  }

  q('[data-country]').addEventListener('change', function () {
    setError('mobile', '');
    updateMobileHint();
  });

  function openMobileModal(cls) {
    state.cls = cls;
    q('[data-class-topic]').textContent = cls.topic;
    q('[data-class-when]').textContent = whenText(cls);
    modal.querySelectorAll('[data-user-name]').forEach(function (el) { el.textContent = state.user.name; });
    modal.querySelectorAll('[data-user-email]').forEach(function (el) { el.textContent = state.user.email; });
    modal.querySelectorAll('[data-user-initial]').forEach(function (el) { el.textContent = state.user.name.charAt(0).toUpperCase(); });
    q('[data-form="details"]').elements.mobile.value = '';
    setError('mobile', '');
    updateMobileHint();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
    setTimeout(function () { q('[data-autofocus]').focus(); }, 50);
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
  }

  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) closeModal();
    if (e.target.closest('[data-signout]')) { closeModal(); logout(); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  q('[data-form="details"]').addEventListener('submit', function (e) {
    e.preventDefault();
    var country = currentCountry();
    var number = normaliseMobile(this.elements.mobile.value);
    if (!country || !new RegExp(country.pattern).test(number)) {
      setError('mobile', 'Enter a valid ' + (country ? country.name : '') + ' mobile number (' + (country ? country.digits : '') + '), without the country code.');
      return;
    }
    setError('mobile', '');
    enrolNow(state.cls, { country_code: country.code, mobile: number });
  });

  /* ---------- coming back from Google ---------- */

  var SIGNIN_ERRORS = {
    expired: 'Your Google sign-in session expired. Please try again.',
    failed: 'Google sign-in was cancelled or did not complete. Please try again.',
    'no-email': 'Google did not share an email address, so we could not sign you in.'
  };

  function handleReturn() {
    var params = new URLSearchParams(location.search);
    var id = params.get('class');
    var error = params.get('signin');
    if (!id && !error) return;
    history.replaceState(null, '', location.pathname + location.hash);

    if (error) {
      notice('error', esc(SIGNIN_ERRORS[error] || 'Sign-in did not complete. Please try again.'));
      return;
    }

    var cls = findClass(id);
    var intent = takeIntent();

    if (!cls) {
      notice('info', 'That class is no longer open. Here are the upcoming classes.');
      return;
    }
    if (!state.user) {
      notice('error', 'We could not confirm your sign-in. Please try again.');
      return;
    }
    if (state.enrolled[cls.id]) {
      refreshButtons();
      notice('info', 'You\'re already enrolled in <strong>' + esc(cls.topic) + '</strong>.');
      return;
    }
    if (intent === cls.id) {
      // The student started the sign-up from this class: finish it (mobile number first, only if missing).
      startEnrol(cls);
    } else {
      var card = listEl.querySelector('[data-class-card="' + cls.id + '"]');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /* ---------- start ---------- */

  renderAccount();
  renderList();
  Promise.all([loadSession(), loadSessions()]).then(function () {
    renderAccount();
    renderList();
    handleReturn();
  });

  // Keep "opens at" / "Join class" / "Class ended" right without a reload, and the seat counts fresh.
  setInterval(refreshButtons, 20000);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    refreshButtons();
    if (Date.now() - state.sessionsAt > 120000) loadSessions().then(function () { if (!state.sessionsFailed) renderList(); });
  });
})();
