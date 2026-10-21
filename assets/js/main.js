// Smooth scroll to an in-page section (used when a page has multiple sections)
function smoothScroll(targetId) {
  const element = document.getElementById(targetId);
  if (element) {
    const navHeight = document.getElementById('navbar').offsetHeight;
    const targetPosition = element.offsetTop - navHeight - 20;
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  }
}

// Mobile menu toggle
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const panel = document.getElementById('mobile-menu-panel');

  if (menu.classList.contains('opacity-0')) {
    menu.classList.remove('opacity-0', 'pointer-events-none');
    menu.classList.add('opacity-100');
    panel.classList.remove('translate-x-full');
    panel.classList.add('translate-x-0');
  } else {
    menu.classList.add('opacity-0', 'pointer-events-none');
    menu.classList.remove('opacity-100');
    panel.classList.add('translate-x-full');
    panel.classList.remove('translate-x-0');
  }
}

// Navbar scroll effect — subtle shadow for depth once the page scrolls
window.addEventListener('scroll', function() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  if (window.scrollY > 50) {
    navbar.classList.add('shadow-lg');
  } else {
    navbar.classList.remove('shadow-lg');
  }
});

// Portfolio filter bar (Portfolio listing page only — no-op elsewhere)
function initPortfolioFilter() {
  const bar = document.getElementById('portfolio-filter-bar');
  const grid = document.getElementById('portfolio-grid');
  if (!bar || !grid) return;

  const buttons = bar.querySelectorAll('.filter-tag');
  const cards = grid.querySelectorAll('.portfolio-card');

  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      buttons.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      cards.forEach(function(card) {
        const show = filter === 'all' || card.getAttribute('data-industry') === filter;
        card.classList.toggle('hidden', !show);
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', initPortfolioFilter);

// Certifications filter bar (Certifications page only — no-op elsewhere)
function initCertificationsFilter() {
  const bar = document.getElementById('certifications-filter-bar');
  const grid = document.getElementById('certifications-grid');
  if (!bar || !grid) return;

  const buttons = bar.querySelectorAll('.filter-tag');
  const cards = grid.querySelectorAll('[data-category]');

  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      buttons.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      cards.forEach(function(card) {
        const show = filter === 'all' || card.getAttribute('data-category') === filter;
        card.classList.toggle('hidden', !show);
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', initCertificationsFilter);

// Certificate lightbox (Certifications page only — no-op elsewhere)
function initCertificateLightbox() {
  const modal = document.getElementById('certificate-lightbox');
  if (!modal) return;

  const modalImg = document.getElementById('certificate-lightbox-img');
  const closeBtn = document.getElementById('certificate-lightbox-close');

  function closeLightbox() {
    modal.classList.add('hidden');
    modalImg.src = '';
  }

  document.querySelectorAll('.certificate-card').forEach(function(card) {
    card.addEventListener('click', function() {
      const src = card.getAttribute('data-image');
      if (!src) return;
      modalImg.src = src;
      modal.classList.remove('hidden');
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeLightbox();
  });
}

document.addEventListener('DOMContentLoaded', initCertificateLightbox);

// Count-up stats: animate from 0 when scrolled into view (Home page stats band only — no-op elsewhere)
function initStatCircles() {
  const items = document.querySelectorAll('.count-up');
  if (!items.length) return;

  function animateItem(el) {
    const target = parseFloat(el.getAttribute('data-count-target')) || 0;
    const decimals = parseInt(el.getAttribute('data-count-decimals') || '0', 10);
    const prefix = el.getAttribute('data-count-prefix') || '';
    const suffix = el.getAttribute('data-count-suffix') || '';
    const duration = 1500;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      el.textContent = prefix + current.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        animateItem(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  items.forEach(function(el) { observer.observe(el); });
}

document.addEventListener('DOMContentLoaded', initStatCircles);

// Country dial codes with expected national mobile number length (Contact page only)
const COUNTRY_CODES = [
  { code: '+91', name: 'India', digits: 10 },
  { code: '+1', name: 'USA / Canada', digits: 10 },
  { code: '+44', name: 'United Kingdom', digits: 10 },
  { code: '+61', name: 'Australia', digits: 9 },
  { code: '+64', name: 'New Zealand', digits: [8, 9] },
  { code: '+971', name: 'UAE', digits: 9 },
  { code: '+966', name: 'Saudi Arabia', digits: 9 },
  { code: '+974', name: 'Qatar', digits: 8 },
  { code: '+92', name: 'Pakistan', digits: 10 },
  { code: '+880', name: 'Bangladesh', digits: 10 },
  { code: '+977', name: 'Nepal', digits: 10 },
  { code: '+94', name: 'Sri Lanka', digits: 9 },
  { code: '+65', name: 'Singapore', digits: 8 },
  { code: '+60', name: 'Malaysia', digits: [9, 10] },
  { code: '+86', name: 'China', digits: 11 },
  { code: '+81', name: 'Japan', digits: 10 },
  { code: '+82', name: 'South Korea', digits: [9, 10] },
  { code: '+49', name: 'Germany', digits: [10, 11] },
  { code: '+33', name: 'France', digits: 9 },
  { code: '+39', name: 'Italy', digits: [9, 10] },
  { code: '+34', name: 'Spain', digits: 9 },
  { code: '+7', name: 'Russia', digits: 10 },
  { code: '+27', name: 'South Africa', digits: 9 },
  { code: '+55', name: 'Brazil', digits: 11 },
];

function populateCountryCodeSelect() {
  const select = document.getElementById('form-country-code');
  if (!select) return;
  select.innerHTML = COUNTRY_CODES.map(function(c) {
    const digitsAttr = Array.isArray(c.digits) ? c.digits.join('-') : c.digits;
    return '<option value="' + c.code + '" data-digits="' + digitsAttr + '">' + c.name + ' (' + c.code + ')</option>';
  }).join('');
  updatePhonePlaceholder();
}

function getExpectedDigitRange(select) {
  const opt = select.options[select.selectedIndex];
  const raw = opt.getAttribute('data-digits');
  if (raw.indexOf('-') !== -1) {
    const parts = raw.split('-').map(Number);
    return { min: parts[0], max: parts[1] };
  }
  const n = Number(raw);
  return { min: n, max: n };
}

function updatePhonePlaceholder() {
  const select = document.getElementById('form-country-code');
  const input = document.getElementById('form-phone');
  if (!select || !input) return;
  const range = getExpectedDigitRange(select);
  input.placeholder = range.min === range.max
    ? range.min + '-digit mobile number'
    : range.min + '-' + range.max + ' digit mobile number';
}

function validatePhone() {
  const select = document.getElementById('form-country-code');
  const input = document.getElementById('form-phone');
  const error = document.getElementById('phone-error');
  if (!select || !input || !error) return true;

  const digitsOnly = input.value.replace(/\D/g, '');

  // Phone is required
  if (!digitsOnly) {
    error.textContent = 'Phone number is required';
    error.classList.remove('hidden');
    input.classList.add('border-red-500');
    return false;
  }

  const range = getExpectedDigitRange(select);
  const countryName = select.options[select.selectedIndex].textContent;
  const valid = digitsOnly.length >= range.min && digitsOnly.length <= range.max;

  if (!valid) {
    const expectedText = range.min === range.max ? (range.min + ' digits') : (range.min + '-' + range.max + ' digits');
    error.textContent = 'Enter a valid ' + expectedText + ' mobile number for ' + countryName;
    error.classList.remove('hidden');
    input.classList.add('border-red-500');
    return false;
  }

  error.classList.add('hidden');
  input.classList.remove('border-red-500');
  return true;
}

function validateEmail() {
  const input = document.getElementById('form-email');
  const error = document.getElementById('email-error');
  if (!input || !error) return true;

  // Email is optional; only validate format if the user typed something
  if (!input.value.trim()) {
    error.classList.add('hidden');
    input.classList.remove('border-red-500');
    return true;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid = emailRegex.test(input.value.trim());

  if (!valid) {
    error.classList.remove('hidden');
    input.classList.add('border-red-500');
    return false;
  }

  error.classList.add('hidden');
  input.classList.remove('border-red-500');
  return true;
}

// Fills the hidden source_page field with the current page's path + title
function populateSourcePage() {
  const input = document.getElementById('form-source-page');
  if (!input) return;
  input.value = document.title + ' (' + window.location.pathname + ')';
}

document.addEventListener('DOMContentLoaded', function() {
  populateCountryCodeSelect();
  populateSourcePage();

  const emailInput = document.getElementById('form-email');
  const phoneInput = document.getElementById('form-phone');
  const countrySelect = document.getElementById('form-country-code');

  if (emailInput) emailInput.addEventListener('blur', validateEmail);
  if (phoneInput) phoneInput.addEventListener('blur', validatePhone);
  if (countrySelect) {
    countrySelect.addEventListener('change', function() {
      updatePhonePlaceholder();
      if (phoneInput && phoneInput.value) validatePhone();
    });
  }
});

// Form submission handler - connected to the "Website Leads" Apps Script (Contact page only)
//
// PASTE THE DEPLOYED WEB APP URL HERE once you've completed the manual deploy step
// (Deploy > New deployment > Web app, execute as me, accessible to Anyone > copy the URL).
// Until this is filled in, the form will show the error/WhatsApp-fallback state on every submit.
const LEADS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz1kckQ5vIQnR2mNQ7ChucD6Qry5yTe_GowfBl3qK8ox6IUqwYaimijc8NW7JLZ3V8D/exec';

function handleFormSubmission(event) {
  event.preventDefault();

  const submitBtn = document.getElementById('contact-submit-btn');
  const submitBtnText = document.getElementById('contact-submit-btn-text');

  // Guard against rapid double-clicks / double form submission
  if (submitBtn.disabled) return;

  const nameInput = document.getElementById('form-name');

  if (!nameInput.value.trim()) {
    alert('Please enter your name');
    nameInput.focus();
    return;
  }

  const phoneValid = validatePhone();
  if (!phoneValid) {
    document.getElementById('form-phone').focus();
    return;
  }

  const emailValid = validateEmail();
  if (!emailValid) {
    document.getElementById('form-email').focus();
    return;
  }

  const serviceInput = document.getElementById('form-service');
  if (!serviceInput.value) {
    alert('Please select what you need help with');
    serviceInput.focus();
    return;
  }

  const messageInput = document.getElementById('form-message');
  if (!messageInput.value.trim()) {
    alert('Please tell me a little about your business');
    messageInput.focus();
    return;
  }

  const countryCode = document.getElementById('form-country-code').value;
  const phoneDigits = document.getElementById('form-phone').value.replace(/\D/g, '');

  const formData = {
    name: nameInput.value.trim(),
    phone: countryCode + ' ' + phoneDigits,
    email: document.getElementById('form-email').value.trim(),
    service: serviceInput.value,
    budget: document.getElementById('form-budget').value,
    message: messageInput.value.trim(),
    source_page: document.getElementById('form-source-page').value,
    // Real users never fill this in; a filled value means a bot
    website: document.getElementById('form-website').value
  };

  submitBtn.disabled = true;
  submitBtnText.textContent = 'Sending...';

  function showSuccess() {
    document.getElementById('audit-form').classList.add('hidden');
    document.getElementById('form-error').classList.add('hidden');
    document.getElementById('form-success').classList.remove('hidden');
    event.target.reset();
    populateSourcePage();
    submitBtnText.textContent = 'Send Message';
    submitBtn.disabled = false;
  }

  function showError() {
    document.getElementById('audit-form').classList.add('hidden');
    document.getElementById('form-success').classList.add('hidden');
    document.getElementById('form-error').classList.remove('hidden');
    submitBtnText.textContent = 'Send Message';
    submitBtn.disabled = false;
  }

  // Sent as text/plain (not application/json) so this stays a CORS "simple request" —
  // Apps Script Web Apps don't handle CORS preflight (OPTIONS) requests, so avoiding
  // the preflight is what lets us actually read the response and show real success/error
  // states below, instead of firing blind with mode: 'no-cors'.
  fetch(LEADS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(formData)
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data && data.success) {
        showSuccess();
      } else {
        showError();
      }
    })
    .catch(showError);
}

// Header: a guest sees the green "Courses" pill (the merged courses and live classes page) and a "Log in" link. A student who is signed in sees
// two pills, "Courses" and "My Classes" (their own page in the app), and no "Log in". Reads only the small "logged in" hint cookie set by the
// Live Classes app (value "1", no personal data) and makes no network call. It is just labels and links: My Classes
// itself checks the real login. Without JavaScript, or without the cookie, the guest header stays.
(function () {
  try {
    var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    var appBase = isLocal ? location.protocol + '//' + location.hostname + ':8000' : '/classes';
    // The "Log in" links point at the app's login page (the app lives on another port while developing locally).
    document.querySelectorAll('a[data-lc-login]').forEach(function (a) { a.setAttribute('href', appBase + '/login'); });
    if (!/(?:^|;\s*)lc_in=1(?:;|$)/.test(document.cookie)) return;
    document.querySelectorAll('[data-lc-guest]').forEach(function (el) { el.classList.add('hidden'); });
    var myClasses = appBase + '/my-classes';
    document.querySelectorAll('a[data-lc-pill]').forEach(function (a) {
      if (a.textContent.replace(/\s+/g, ' ').trim() !== 'Courses') return;
      // The label is the last direct <span> child (one header variant nests a hidden "Live " span inside it).
      var label = null;
      Array.prototype.forEach.call(a.children, function (c) { if (c.tagName === 'SPAN' && c.textContent.trim()) label = c; });
      if (!label) return;

      // "Courses": a copy of the pill (no pulsing dot, so it stays compact) placed before "My Classes".
      var classes = a.cloneNode(true);
      classes.setAttribute('data-lc-added', '1');
      classes.setAttribute('href', '/courses/');
      classes.removeAttribute('data-lc-swapped');
      classes.removeAttribute('data-lc-pill');
      var dot = classes.firstElementChild;
      if (dot && dot.children.length) classes.removeChild(dot);
      var clabel = null;
      Array.prototype.forEach.call(classes.children, function (c) { if (c.tagName === 'SPAN' && c.textContent.trim()) clabel = c; });
      if (clabel) clabel.textContent = 'Courses';
      a.parentNode.insertBefore(classes, a);

      // The small header pill (phones) is short of width with two links: hide its pulsing dot, put back on log out.
      var firstDot = a.firstElementChild;
      var compact = /text-\[11px\]/.test(a.className);   // phone header pill
      var desktop = /px-4 py-2 rounded-full/.test(a.className); // desktop header pill: two pills must fit beside the nav links
      if ((compact || desktop) && firstDot && firstDot.children.length) { firstDot.classList.add('hidden'); a.setAttribute('data-lc-dot', '1'); }
      if (desktop) { a.setAttribute('data-lc-class', a.className); a.className = a.className.replace('px-4', 'px-3'); classes.className = a.className; }

      // Remember the original so the courses page can put it back on log out.
      a.setAttribute('data-lc-swapped', label.innerHTML);
      label.textContent = 'My Classes';
      a.setAttribute('href', myClasses);
    });
  } catch (e) { /* the header just keeps its default link */ }
})();

// Header "Courses" dropdown (desktop): point at the green Courses pill and a list opens with every course page, so a visitor can go straight
// to one. The pill itself still links to the Courses page (so touch screens, keyboards without hover and no-JavaScript visitors lose nothing).
// One floating panel serves every page; it follows whichever pill currently says "Courses" (also the extra pill a signed-in student gets).
// The phone menu gets the same links as a short list under its Courses pill. No libraries, no network calls.
(function () {
  try {
    var ITEMS = [
      ['All courses', 'Courses and upcoming live classes', '/courses/'],
      ['Master Classes', '3-hour live deep dives', '/courses/master-classes/'],
      ['Google Ads', 'Search and Demand Gen lead campaigns', '/courses/google-ads/'],
      ['Meta Ads', 'Lead and engagement campaigns', '/courses/meta-ads/'],
      ['Claude and Claude Code', 'Prompting, building and automation', '/courses/claude-mastery/']
    ];
    var calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    var css = document.createElement('style');
    css.id = 'courses-menu-css';
    css.textContent =
      '#courses-menu{position:fixed;z-index:60;width:292px;max-width:calc(100vw - 16px);padding-top:10px;opacity:0;visibility:hidden;transform:translateY(-6px);' +
      (calm ? '' : 'transition:opacity .16s ease,transform .16s ease,visibility .16s;') + '}' +
      '#courses-menu.is-open{opacity:1;visibility:visible;transform:none}' +
      '#courses-menu .cm-box{background:#fff;border:1px solid #E2E8F0;border-radius:16px;box-shadow:0 18px 40px rgba(15,23,42,.22);padding:8px;font-family:"Plus Jakarta Sans",system-ui,sans-serif}' +
      '#courses-menu a{display:block;padding:10px 12px;border-radius:10px;text-decoration:none;min-height:44px;color:#1F2937}' +
      '#courses-menu a:hover,#courses-menu a:focus-visible{background:#EFF6FF;outline:none}' +
      '#courses-menu a:focus-visible{box-shadow:0 0 0 3px #F59E0B}' +
      '#courses-menu .cm-t{display:block;font-size:14px;font-weight:700;line-height:1.3}' +
      '#courses-menu .cm-d{display:block;margin-top:2px;font-size:12px;line-height:1.35;color:#475569}' +
      '#courses-menu .cm-all{border-bottom:1px solid #E2E8F0;border-radius:10px 10px 0 0;margin-bottom:4px}' +
      '.cm-mobile{display:flex;flex-direction:column;gap:2px;margin:-6px 0 0 12px;padding-left:12px;border-left:2px solid rgba(255,255,255,.25)}' +
      '.cm-mobile a{display:block;padding:9px 4px;font-size:13px;font-weight:500;color:rgba(255,255,255,.78);text-decoration:none}' +
      '.cm-mobile a:hover{color:#fff}' +
      // Phone header: the Courses (and signed-in My Classes) pill is a white button with blue text, big enough to tap.
      '#mobile-header-actions a[data-lc-pill],#mobile-header-actions a[data-lc-added]{background:#fff;color:#1560A8;font-size:12px;font-weight:700;line-height:1;padding:9px 14px;min-height:36px;border:1px solid rgba(21,96,168,.18);box-shadow:0 2px 8px rgba(0,0,0,.22);' +
      (calm ? '' : 'transition:background .15s ease,transform .1s ease;') + '}' +
      '#mobile-header-actions a[data-lc-pill]:hover,#mobile-header-actions a[data-lc-added]:hover{background:#EFF6FF}' +
      '#mobile-header-actions a[data-lc-pill]:active,#mobile-header-actions a[data-lc-added]:active{transform:scale(.97)}' +
      '#mobile-header-actions a[data-lc-pill]:focus-visible,#mobile-header-actions a[data-lc-added]:focus-visible{outline:3px solid #F59E0B;outline-offset:2px}' +
      '#mobile-header-actions a[data-lc-pill] span span,#mobile-header-actions a[data-lc-added] span span{background-color:#1E8449}' +
      '@media (max-width:360px){#mobile-header-actions a[data-lc-pill],#mobile-header-actions a[data-lc-added]{font-size:11px;padding:8px 10px}}';
    document.head.appendChild(css);

    var menu = document.createElement('div');
    menu.id = 'courses-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Courses');
    var box = document.createElement('div');
    box.className = 'cm-box';
    ITEMS.forEach(function (it, i) {
      var a = document.createElement('a');
      a.href = it[2];
      a.setAttribute('role', 'menuitem');
      if (i === 0) a.className = 'cm-all';
      a.innerHTML = '<span class="cm-t"></span><span class="cm-d"></span>';
      a.firstChild.textContent = it[0];
      a.lastChild.textContent = it[1];
      box.appendChild(a);
    });
    menu.appendChild(box);
    document.body.appendChild(menu);

    var current = null, hideTimer = null;
    function isCoursesPill(el) {
      if (!el || el.tagName !== 'A') return false;
      if (!el.hasAttribute('data-lc-pill') && !el.hasAttribute('data-lc-added')) return false;
      if (el.closest('#mobile-menu') || el.closest('#mobile-header-actions')) return false;   // desktop header only
      return el.getAttribute('href') === '/courses/';                                          // not the "My Classes" pill
    }
    function open(pill) {
      window.clearTimeout(hideTimer);
      current = pill;
      var r = pill.getBoundingClientRect();
      var w = Math.min(292, window.innerWidth - 16);
      var left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8));
      menu.style.top = (r.bottom - 6) + 'px';
      menu.style.left = left + 'px';
      menu.classList.add('is-open');
      pill.setAttribute('aria-haspopup', 'true');
      pill.setAttribute('aria-expanded', 'true');
    }
    function close() {
      menu.classList.remove('is-open');
      if (current) current.setAttribute('aria-expanded', 'false');
      current = null;
    }
    function closeSoon() { window.clearTimeout(hideTimer); hideTimer = window.setTimeout(close, 180); }

    document.addEventListener('mouseover', function (e) {
      var pill = e.target.closest && e.target.closest('a');
      if (isCoursesPill(pill)) { if (window.innerWidth >= 1280) open(pill); return; }
      if (menu.contains(e.target)) window.clearTimeout(hideTimer);
    });
    document.addEventListener('mouseout', function (e) {
      var from = e.target.closest && e.target.closest('a');
      if (isCoursesPill(from) || menu.contains(e.target)) closeSoon();
    });
    document.addEventListener('focusin', function (e) {
      if (isCoursesPill(e.target) && window.innerWidth >= 1280) open(e.target);
      else if (!menu.contains(e.target) && menu.classList.contains('is-open')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (!menu.classList.contains('is-open')) return;
      var items = Array.prototype.slice.call(menu.querySelectorAll('a'));
      var at = items.indexOf(document.activeElement);
      if (e.key === 'Escape') { var p = current; close(); if (p) p.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); items[(at + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp' && at >= 0) { e.preventDefault(); items[(at - 1 + items.length) % items.length].focus(); }
    });
    window.addEventListener('scroll', function () { if (menu.classList.contains('is-open')) close(); }, { passive: true });
    window.addEventListener('resize', close);

    // Phone menu: the same links as a short list under the Courses pill.
    var mobile = document.getElementById('mobile-menu');
    if (mobile) {
      var pills = mobile.querySelectorAll('a[data-lc-pill], a[data-lc-added]');
      Array.prototype.forEach.call(pills, function (p) {
        if (p.getAttribute('href') !== '/courses/' || mobile.querySelector('.cm-mobile')) return;
        var list = document.createElement('div');
        list.className = 'cm-mobile';
        ITEMS.slice(1).forEach(function (it) {
          var a = document.createElement('a');
          a.href = it[2];
          a.textContent = it[0];
          list.appendChild(a);
        });
        p.parentNode.insertBefore(list, p.nextSibling);
      });
    }
  } catch (e) { /* the header keeps its plain Courses link */ }
})();
