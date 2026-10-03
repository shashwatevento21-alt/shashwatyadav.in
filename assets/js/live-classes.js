(function () {
  'use strict';

  // Layout preview: while true, sign-in / OTP / enrolment are simulated in the browser and nothing is saved.
  var PREVIEW_MODE = true;
  var TZ = 'Asia/Kolkata';

  var listEl = document.getElementById('classes-list');
  var emptyEl = document.getElementById('classes-empty');
  var countEl = document.getElementById('classes-count');
  var modal = document.getElementById('enroll-modal');
  if (!listEl || !modal) return;

  var state = { cls: null, user: null, mobile: '', verified: false, enrolled: {} };

  function wait(value) {
    return new Promise(function (resolve) { setTimeout(function () { resolve(value); }, 600); });
  }

  // Backend hooks: replace these four with real calls (Google OAuth, SMS OTP, save enrolment).
  var api = {
    googleSignIn: function () { return wait({ name: 'Sample Student', email: 'sample.student@gmail.com', via: 'google' }); },
    sendOtp: function () { return wait({ ok: true }); },
    verifyOtp: function () { return wait({ ok: true }); },
    enrol: function () { return wait({ ok: true }); }
  };

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
    return '+91 ' + m.slice(0, 2) + '••••••' + m.slice(-2);
  }

  /* ---------- class list ---------- */

  function upcoming() {
    var now = Date.now();
    return (window.LIVE_CLASSES || [])
      .map(function (c) {
        var start = new Date(c.startsAt);
        return Object.assign({}, c, { start: start, end: new Date(start.getTime() + c.durationMins * 60000) });
      })
      .filter(function (c) { return !isNaN(c.start.getTime()) && c.end.getTime() > now; })
      .sort(function (a, b) { return a.start - b.start; });
  }

  var ICON_CLOCK = '<svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 2"/></svg>';
  var ICON_CHECK = '<svg class="w-4 h-4 text-growth-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
  var ICON_CHEVRON = '<svg data-chevron class="w-4 h-4 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>';
  var ICON_ARROW = '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>';

  function joinButton(cls) {
    if (state.enrolled[cls.id]) return enrolledButton();
    return '<button type="button" data-join="' + esc(cls.id) + '" class="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all">Join class ' + ICON_ARROW + '</button>';
  }

  function enrolledButton() {
    return '<span class="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-growth-accent/10 text-growth-accent text-sm font-semibold border border-growth-accent/30">' +
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Enrolled</span>';
  }

  function cardHtml(cls, index) {
    var isNext = index === 0;
    var rel = relativeLabel(cls);
    var relClass = rel === 'Live now' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-cta-accent/10 text-amber-700 border-cta-accent/30';
    var detailsId = 'details-' + cls.id;
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
              '<a href="/courses/' + esc(cls.courseSlug) + '" class="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/15 transition-colors">' + esc(cls.course) + '</a>' +
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
          '<h4 class="text-sm font-semibold text-text-heading mb-3">What you\'ll learn in this class</h4>' +
          '<ul class="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">' +
            cls.learn.map(function (item) {
              return '<li class="flex items-start gap-2 text-sm text-text-body">' + ICON_CHECK + '<span>' + esc(item) + '</span></li>';
            }).join('') +
          '</ul>' +
        '</div>' +
      '</article>';
  }

  var classes = [];

  function renderList() {
    classes = upcoming();
    listEl.innerHTML = classes.map(cardHtml).join('');
    emptyEl.classList.toggle('hidden', classes.length > 0);
    if (countEl) countEl.textContent = classes.length ? classes.length + (classes.length === 1 ? ' upcoming class' : ' upcoming classes') : '';
  }

  function findClass(id) {
    for (var i = 0; i < classes.length; i++) if (classes[i].id === id) return classes[i];
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

  function markEnrolled(id) {
    var card = listEl.querySelector('[data-class-card="' + id + '"]');
    if (card) card.querySelector('[data-join-slot]').innerHTML = enrolledButton();
  }

  /* ---------- enrol modal ---------- */

  var STEPS = ['account', 'mobile', 'otp'];
  var panels = modal.querySelectorAll('[data-step-panel]');
  var dots = modal.querySelectorAll('[data-dot]');
  var steps = modal.querySelector('[data-steps]');
  var resendTimer = null;

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
    var idx = STEPS.indexOf(name);
    steps.classList.toggle('hidden', idx === -1);
    dots.forEach(function (d, i) {
      d.classList.toggle('bg-primary', i <= idx);
      d.classList.toggle('bg-border', i > idx);
    });
    var target = q('[data-step-panel="' + name + '"] [data-autofocus]');
    if (target) setTimeout(function () { target.focus(); }, 50);
  }

  function fillClassSummary() {
    q('[data-class-topic]').textContent = state.cls.topic;
    q('[data-class-when]').textContent = whenText(state.cls);
  }

  function fillUser() {
    modal.querySelectorAll('[data-user-name]').forEach(function (el) { el.textContent = state.user.name; });
    modal.querySelectorAll('[data-user-email]').forEach(function (el) { el.textContent = state.user.email; });
    modal.querySelectorAll('[data-user-initial]').forEach(function (el) { el.textContent = state.user.name.charAt(0).toUpperCase(); });
    modal.querySelectorAll('[data-user-mobile]').forEach(function (el) { el.textContent = state.mobile ? maskMobile(state.mobile) : ''; });
  }

  function openModal(cls) {
    if (!cls) return;
    state.cls = cls;
    fillClassSummary();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
    if (state.user && state.verified) {
      fillUser();
      showStep('confirm');
    } else if (state.user) {
      fillUser();
      showStep('mobile');
    } else {
      showStep('account');
    }
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
    clearInterval(resendTimer);
  }

  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  function afterSignIn(user) {
    state.user = user;
    fillUser();
    showStep('mobile');
  }

  q('[data-google-btn]').addEventListener('click', function () {
    var btn = this;
    setBusy(btn, true, 'Connecting to Google…');
    api.googleSignIn().then(function (user) {
      setBusy(btn, false);
      afterSignIn(user);
    });
  });

  q('[data-form="account"]').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = this.elements.name.value.trim();
    var email = this.elements.email.value.trim();
    var ok = true;
    setError('name', '');
    setError('email', '');
    if (name.length < 2) { setError('name', 'Please enter your full name.'); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('email', 'Please enter a valid email address.'); ok = false; }
    if (ok) afterSignIn({ name: name, email: email, via: 'email' });
  });

  q('[data-form="mobile"]').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = this.querySelector('button[type="submit"]');
    var mobile = this.elements.mobile.value.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('mobile', 'Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setError('mobile', '');
    state.mobile = mobile;
    setBusy(btn, true, 'Sending OTP…');
    api.sendOtp(mobile).then(function () {
      setBusy(btn, false);
      fillUser();
      clearOtp();
      showStep('otp');
      startResendTimer();
    });
  });

  q('[data-change-number]').addEventListener('click', function () {
    clearInterval(resendTimer);
    showStep('mobile');
  });

  var otpInputs = Array.prototype.slice.call(modal.querySelectorAll('[data-otp]'));

  function clearOtp() {
    otpInputs.forEach(function (i) { i.value = ''; });
  }

  otpInputs.forEach(function (input, i) {
    input.addEventListener('input', function () {
      input.value = input.value.replace(/\D/g, '').slice(-1);
      if (input.value && otpInputs[i + 1]) otpInputs[i + 1].focus();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !input.value && otpInputs[i - 1]) otpInputs[i - 1].focus();
    });
    input.addEventListener('paste', function (e) {
      var digits = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, otpInputs.length);
      if (!digits) return;
      e.preventDefault();
      digits.split('').forEach(function (d, k) { otpInputs[k].value = d; });
      otpInputs[Math.min(digits.length, otpInputs.length - 1)].focus();
    });
  });

  function startResendTimer() {
    var btn = q('[data-resend]');
    var left = 30;
    clearInterval(resendTimer);
    btn.disabled = true;
    btn.textContent = 'Resend OTP in ' + left + 's';
    resendTimer = setInterval(function () {
      left--;
      if (left <= 0) {
        clearInterval(resendTimer);
        btn.disabled = false;
        btn.textContent = 'Resend OTP';
      } else {
        btn.textContent = 'Resend OTP in ' + left + 's';
      }
    }, 1000);
  }

  q('[data-resend]').addEventListener('click', function () {
    var btn = this;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    api.sendOtp(state.mobile).then(function () {
      clearOtp();
      otpInputs[0].focus();
      startResendTimer();
    });
  });

  function completeEnrolment() {
    state.enrolled[state.cls.id] = true;
    markEnrolled(state.cls.id);
    fillUser();
    q('[data-done-topic]').textContent = state.cls.topic;
    q('[data-done-when]').textContent = whenText(state.cls);
    showStep('done');
  }

  q('[data-form="otp"]').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = this.querySelector('button[type="submit"]');
    var code = otpInputs.map(function (i) { return i.value; }).join('');
    if (code.length !== otpInputs.length) {
      setError('otp', 'Enter the 6-digit code we sent you.');
      return;
    }
    setError('otp', '');
    setBusy(btn, true, 'Verifying…');
    api.verifyOtp(state.mobile, code)
      .then(function () {
        state.verified = true;
        return api.enrol({ classId: state.cls.id, course: state.cls.course, name: state.user.name, email: state.user.email, mobile: state.mobile });
      })
      .then(function () {
        setBusy(btn, false);
        clearInterval(resendTimer);
        completeEnrolment();
      });
  });

  q('[data-confirm-btn]').addEventListener('click', function () {
    var btn = this;
    setBusy(btn, true, 'Enrolling…');
    api.enrol({ classId: state.cls.id, course: state.cls.course, name: state.user.name, email: state.user.email, mobile: state.mobile })
      .then(function () {
        setBusy(btn, false);
        completeEnrolment();
      });
  });

  if (PREVIEW_MODE) q('[data-preview-note]').classList.remove('hidden');

  renderList();
})();
