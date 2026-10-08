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
  var noticeEl = document.getElementById('lc-notice');
  var modal = document.getElementById('enroll-modal');
  if (!listEl || !modal) return;

  var state = {
    cls: null, csrf: '', countries: [], user: null, mobile: null, enrolled: {}, apiOk: false,
    sessions: [], sessionsLoaded: false, sessionsFailed: false, sessionsAt: 0, busy: {}
  };

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
    if (!accountEl) return;
    if (state.user) {
      accountEl.innerHTML =
        '<span class="text-text-body hidden sm:inline">Hi, ' + esc(state.user.name.split(' ')[0]) + '</span>' +
        '<a href="' + esc(myClassesUrl()) + '" class="font-semibold text-primary hover:underline">My classes &rarr;</a>' +
        '<button type="button" data-logout class="text-text-body/80 hover:text-text-heading underline underline-offset-2">Log out</button>';
    } else {
      accountEl.innerHTML = '<a id="lc-signup-link" href="' + esc(signInUrl()) + '" class="inline-flex items-center px-4 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all">Sign up / Log in</a>';
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

  // main.js turned the header's "Join Live Classes" into "My Classes" while signed in; put it back.
  function restoreHeader() {
    document.querySelectorAll('a[data-lc-swapped]').forEach(function (a) {
      var label = null;
      Array.prototype.forEach.call(a.children, function (c) { if (c.tagName === 'SPAN' && c.textContent.trim()) label = c; });
      if (label) label.innerHTML = a.getAttribute('data-lc-swapped');
      a.setAttribute('href', '/live-classes');
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
        '<button type="button" data-signup="' + id + '" class="' + BTN_PRIMARY + '">Sign up to enrol ' + ICON_ARROW + '</button>' +
        '<a href="' + esc(signInUrl(cls.id)) + '" data-login="' + id + '" class="text-xs text-center text-primary hover:underline">Already signed up? Log in</a></div>';
    }

    return '<button type="button" data-enrol="' + id + '" class="' + BTN_PRIMARY + '">Enrol ' + ICON_ARROW + '</button>';
  }

  function cardHtml(cls, index) {
    var isNext = index === 0;
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
            '<h3 class="font-semibold text-lg md:text-xl text-text-heading mb-2">' + esc(cls.topic) + '</h3>' +
            '<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-body">' +
              '<span class="inline-flex items-center gap-1.5">' + ICON_CLOCK + esc(fmtTime(cls.start) + ' – ' + fmtTime(cls.end) + ' IST') + '</span>' +
              '<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-background border border-border text-xs font-medium">' + esc(fmtDuration(cls.durationMins)) + '</span>' +
            '</div>' +
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
    listEl.innerHTML = classes.map(cardHtml).join('');
    Object.keys(open).forEach(function (id) {
      var btn = listEl.querySelector('[data-toggle="' + id + '"]');
      if (btn) toggleDetails(btn, true);
    });
    emptyEl.classList.toggle('hidden', classes.length > 0);
    if (countEl) countEl.textContent = classes.length ? classes.length + (classes.length === 1 ? ' upcoming class' : ' upcoming classes') : '';
  }

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

    var login = e.target.closest('[data-login]');
    if (login) { saveIntent(login.getAttribute('data-login')); return; } // the link itself goes to Google

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
          'Your <strong>Join</strong> button appears here and in <a class="underline font-semibold" href="' + esc(myClassesUrl()) + '">My classes</a> ' + JOIN_OPENS_MIN + ' minutes before the class starts.');
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
        notice('info', 'Please sign up or log in to enrol in <strong>' + esc(cls.topic) + '</strong>. It takes a few seconds.');
        return false;
      });
    }
    if (err.status === 401 || err.status === 419) {
      signedOut(); clearHint(); restoreHeader(); renderAccount(); refreshButtons();
      notice('info', 'Your session ended. Please log in again to enrol.');
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
      notice('error', 'Please verify your email address first, or sign in with Google.');
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
    history.replaceState(null, '', location.pathname);

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
