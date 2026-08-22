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
