(function () {
  'use strict';

  var TZ = 'Asia/Kolkata';
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  // Live: the Laravel app is served from the /creators folder of the same domain.
  var API_ORIGIN = isLocal ? location.protocol + '//' + location.hostname + ':8000' : '/creators';

  var listEl = document.getElementById('classes-list');
  var emptyEl = document.getElementById('classes-empty');
  var countEl = document.getElementById('classes-count');
  var myClassesLink = document.getElementById('my-classes-link');
  var modal = document.getElementById('enroll-modal');
  if (!listEl || !modal) return;

  var state = {
    cls: null, csrf: '', countries: [], user: null, mobile: null, enrolled: {}, apiOk: false,
    sessions: [], sessionsLoaded: false, sessionsFailed: false
  };

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

  function applySession(data) {
    state.apiOk = true;
    state.csrf = data.csrfToken;
    state.countries = data.countries || [];
    state.user = data.authenticated ? data.user : null;
    state.mobile = data.authenticated ? data.mobile : null;
    state.enrolled = {};
    (data.enrolled || []).forEach(function (id) { state.enrolled[String(id)] = true; });
    fillCountries();
    if (myClassesLink) {
      myClassesLink.href = API_ORIGIN + '/my-classes';
      myClassesLink.classList.toggle('hidden', !state.user);
    }
  }

  function loadSession() {
    return request('me').then(applySession).catch(function () { state.apiOk = false; });
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

  function loadSessions() {
    return request('sessions')
      .then(function (data) {
        state.sessions = (data.sessions || []).map(toClass);
        state.sessionsFailed = false;
      })
      .catch(function () { state.sessionsFailed = true; })
      .then(function () { state.sessionsLoaded = true; });
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

  function maskMobile(m) {
    if (!m) return '';
    var n = m.number;
    return m.countryCode + ' ' + (n.length > 4 ? n.slice(0, 2) + '••••' + n.slice(-2) : n);
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

  function joinButton(cls) {
    if (state.enrolled[cls.id]) return enrolledButton();
    if (cls.isFull) return fullButton();
    return '<button type="button" data-join="' + esc(cls.id) + '" class="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all">Join class ' + ICON_ARROW + '</button>';
  }

  function enrolledButton() {
    return '<span class="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-growth-accent/10 text-growth-accent text-sm font-semibold border border-growth-accent/30">' +
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Enrolled</span>';
  }

  function fullButton() {
    return '<span class="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-background text-text-body/70 text-sm font-semibold border border-border">Class full</span>';
  }

  function cardHtml(cls, index) {
    var isNext = index === 0;
    var rel = relativeLabel(cls);
    var relClass = rel === 'Live now' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-cta-accent/10 text-amber-700 border-cta-accent/30';
    var detailsId = 'details-' + cls.id;
    var seatsLeft = cls.spotsLeft !== null && cls.spotsLeft !== undefined && !cls.isFull && cls.spotsLeft <= 5
      ? '<span class="px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 text-[11px] font-semibold">' + cls.spotsLeft + (cls.spotsLeft === 1 ? ' seat left' : ' seats left') + '</span>'
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
              seatsLeft +
            '</div>' +
            '<h3 class="font-semibold text-lg md:text-xl text-text-heading mb-2">' + esc(cls.topic) + '</h3>' +
            '<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-body">' +
              '<span class="inline-flex items-center gap-1.5">' + ICON_CLOCK + esc(fmtTime(cls.start) + ' – ' + fmtTime(cls.end) + ' IST') + '</span>' +
              '<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-background border border-border text-xs font-medium">' + esc(fmtDuration(cls.durationMins)) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-2.5 md:flex-shrink-0">' +
            '<button type="button" data-toggle="' + esc(detailsId) + '" aria-expanded="false" aria-controls="' + esc(detailsId) + '" class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-border text-text-heading text-sm font-semibold hover:border-primary/40 hover:text-primary transition-all"><span data-toggle-label>What you\'ll learn</span> ' + ICON_CHEVRON + '</button>' +
            '<span data-join-slot>' + joinButton(cls) + '</span>' +
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
    classes = upcoming();
    listEl.innerHTML = classes.map(cardHtml).join('');
    emptyEl.classList.toggle('hidden', classes.length > 0);
    if (countEl) countEl.textContent = classes.length ? classes.length + (classes.length === 1 ? ' upcoming class' : ' upcoming classes') : '';
  }

  function findClass(id) {
    for (var i = 0; i < classes.length; i++) if (classes[i].id === String(id)) return classes[i];
    return null;
  }

  listEl.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      var panel = document.getElementById(toggle.getAttribute('data-toggle'));
      var open = panel.hasAttribute('hidden');
      panel.toggleAttribute('hidden', !open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.querySelector('[data-toggle-label]').textContent = open ? 'Hide details' : 'What you\'ll learn';
      toggle.querySelector('[data-chevron]').style.transform = open ? 'rotate(180deg)' : '';
      return;
    }
    var join = e.target.closest('[data-join]');
    if (join) openModal(findClass(join.getAttribute('data-join')));
  });

  function setSlot(id, html) {
    var card = listEl.querySelector('[data-class-card="' + id + '"]');
    if (card) card.querySelector('[data-join-slot]').innerHTML = html;
  }

  function markEnrolled(id) { setSlot(id, enrolledButton()); }

  function markFull(id) {
    state.sessions.forEach(function (c) { if (c.id === String(id)) c.isFull = true; });
    setSlot(id, fullButton());
  }

  /* ---------- mobile number ---------- */

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
    select.innerHTML = state.countries.map(function (c) {
      return '<option value="' + esc(c.code) + '">' + esc(c.name) + ' (' + esc(c.code) + ')</option>';
    }).join('');
    updateMobileHint();
  }

  q('[data-country]').addEventListener('change', function () {
    setError('mobile', '');
    updateMobileHint();
  });

  /* ---------- enrol modal ---------- */

  var STEP_INDEX = { account: 0, details: 1, confirm: 1 };
  var panels = modal.querySelectorAll('[data-step-panel]');
  var dots = modal.querySelectorAll('[data-dot]');
  var steps = modal.querySelector('[data-steps]');

  function q(sel) { return modal.querySelector(sel); }

  function setError(name, message) {
    var el = q('[data-error="' + name + '"]');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('hidden', !message);
  }

  function clearErrors() {
    modal.querySelectorAll('[data-error]').forEach(function (el) { el.textContent = ''; el.classList.add('hidden'); });
  }

  function setBusy(btn, busy, label) {
    if (busy) {
      btn.dataset.label = btn.innerHTML;
      btn.innerHTML = label;
      btn.disabled = true;
    } else {
      btn.innerHTML = btn.dataset.label || btn.innerHTML;
      btn.disabled = false;
    }
  }

  function showStep(name) {
    clearErrors();
    panels.forEach(function (p) { p.classList.toggle('hidden', p.getAttribute('data-step-panel') !== name); });
    var idx = STEP_INDEX[name];
    steps.classList.toggle('hidden', idx === undefined);
    dots.forEach(function (d, i) {
      d.classList.toggle('bg-primary', idx !== undefined && i <= idx);
      d.classList.toggle('bg-border', idx === undefined || i > idx);
    });
    var target = q('[data-step-panel="' + name + '"] [data-autofocus]');
    if (target) setTimeout(function () { target.focus(); }, 50);
  }

  function fillUser() {
    if (!state.user) return;
    modal.querySelectorAll('[data-user-name]').forEach(function (el) { el.textContent = state.user.name; });
    modal.querySelectorAll('[data-user-email]').forEach(function (el) { el.textContent = state.user.email; });
    modal.querySelectorAll('[data-user-initial]').forEach(function (el) { el.textContent = state.user.name.charAt(0).toUpperCase(); });
    modal.querySelectorAll('[data-user-mobile]').forEach(function (el) { el.textContent = maskMobile(state.mobile); });
  }

  function prefillMobileForm() {
    var form = q('[data-form="details"]');
    if (state.mobile) {
      q('[data-country]').value = state.mobile.countryCode;
      form.elements.mobile.value = state.mobile.number;
    } else {
      form.elements.mobile.value = '';
    }
    updateMobileHint();
  }

  function openModal(cls) {
    if (!cls) return;
    state.cls = cls;
    q('[data-class-topic]').textContent = cls.topic;
    q('[data-class-when]').textContent = whenText(cls);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
    fillUser();
    if (!state.user) {
      showStep('account');
    } else if (state.mobile) {
      showStep('confirm');
    } else {
      prefillMobileForm();
      showStep('details');
    }
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
  }

  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  q('[data-google-btn]').addEventListener('click', function () {
    if (!state.apiOk) {
      setError('account', 'Sign-in is temporarily unavailable. Please try again later, or message me on WhatsApp.');
      return;
    }
    window.location.href = API_ORIGIN + '/live-classes/google?class=' + encodeURIComponent(state.cls.id);
  });

  function backToSignIn(message) {
    state.user = null;
    state.mobile = null;
    state.enrolled = {};
    if (myClassesLink) myClassesLink.classList.add('hidden');
    renderList();
    showStep('account');
    if (message) setError('account', message);
  }

  function handleEnrolError(err, errorTarget) {
    var data = err.data || {};
    var id = state.cls.id;

    if (err.status === 401 || err.status === 419) {
      loadSession().then(function () { backToSignIn('Your session expired. Please sign in again.'); });
      return;
    }
    if (err.status === 409 && data.code === 'already_enrolled') {
      state.enrolled[id] = true;
      markEnrolled(id);
      setError(errorTarget, "You're already enrolled in this class. You'll find it in My Classes.");
      return;
    }
    if (err.status === 409 && data.code === 'full') {
      markFull(id);
      setError(errorTarget, data.message || 'Sorry, this class is full.');
      return;
    }
    if (err.status === 422 && data.code === 'closed') {
      setError(errorTarget, data.message || 'This class is no longer available.');
      loadSessions().then(renderList);
      return;
    }
    if (err.status === 422 && data.errors) {
      var first = data.errors.mobile || data.errors.country_code || [];
      setError(errorTarget, first[0] || data.message || 'Please check your details.');
      return;
    }
    if (err.status === 403) {
      setError(errorTarget, 'Please verify your email address first, or sign in with Google.');
      return;
    }
    setError(errorTarget, 'Something went wrong. Please try again.');
  }

  function enrol(extra, btn, errorTarget) {
    setBusy(btn, true, 'Enrolling…');
    var body = Object.assign({ session_id: Number(state.cls.id) }, extra || {});
    request('enrol', 'POST', body)
      .then(function (data) {
        setBusy(btn, false);
        state.mobile = data.mobile;
        state.enrolled[state.cls.id] = true;
        markEnrolled(state.cls.id);
        fillUser();
        q('[data-done-topic]').textContent = state.cls.topic;
        q('[data-done-when]').textContent = whenText(state.cls);
        q('[data-done-email-note]').classList.toggle('hidden', !data.emailSent);
        q('[data-done-no-email-note]').classList.toggle('hidden', !!data.emailSent);
        q('[data-my-classes-btn]').href = API_ORIGIN + '/my-classes';
        showStep('done');
      })
      .catch(function (err) {
        setBusy(btn, false);
        handleEnrolError(err, errorTarget);
      });
  }

  q('[data-form="details"]').addEventListener('submit', function (e) {
    e.preventDefault();
    var country = currentCountry();
    var number = normaliseMobile(this.elements.mobile.value);
    if (!country || !new RegExp(country.pattern).test(number)) {
      setError('mobile', 'Enter a valid ' + (country ? country.name : '') + ' mobile number (' + (country ? country.digits : '') + '), without the country code.');
      return;
    }
    setError('mobile', '');
    enrol({ country_code: country.code, mobile: number }, this.querySelector('button[type="submit"]'), 'mobile');
  });

  q('[data-confirm-btn]').addEventListener('click', function () {
    enrol({}, this, 'confirm');
  });

  q('[data-change-number]').addEventListener('click', function () {
    prefillMobileForm();
    showStep('details');
  });

  modal.querySelectorAll('[data-signout]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      request('logout', 'POST').then(function (data) {
        state.csrf = data.csrfToken;
        backToSignIn();
      }).catch(function () {
        backToSignIn('Could not sign out. Please refresh the page and try again.');
      });
    });
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
    var cls = id ? findClass(id) : null;
    if (!cls) return;
    if (error) {
      openModal(cls);
      showStep('account');
      setError('account', SIGNIN_ERRORS[error] || 'Sign-in did not complete. Please try again.');
    } else if (state.user && !state.enrolled[cls.id]) {
      openModal(cls);
    }
  }

  renderList();
  Promise.all([loadSession(), loadSessions()]).then(function () {
    renderList();
    handleReturn();
  });
})();
