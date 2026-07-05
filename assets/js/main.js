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

// Navbar scroll effect
window.addEventListener('scroll', function() {
  const navbar = document.getElementById('navbar-container');
  if (!navbar) return;
  if (window.scrollY > 50) {
    navbar.classList.add('bg-[#0a0b16]/80', 'backdrop-blur-lg', 'border-white/10', 'shadow-lg');
  } else {
    navbar.classList.remove('bg-[#0a0b16]/80', 'backdrop-blur-lg', 'border-white/10', 'shadow-lg');
  }
});

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

  // Phone is optional; only validate if the user typed something
  if (!digitsOnly) {
    error.classList.add('hidden');
    input.classList.remove('border-red-500');
    return true;
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

document.addEventListener('DOMContentLoaded', function() {
  populateCountryCodeSelect();

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

// Form submission handler - Connected to Google Sheets (Contact page only)
function handleFormSubmission(event) {
  event.preventDefault();

  const nameInput = document.getElementById('form-name');

  if (!nameInput.value.trim()) {
    alert('Please enter your name');
    nameInput.focus();
    return;
  }

  const emailValid = validateEmail();
  if (!emailValid) {
    document.getElementById('form-email').focus();
    return;
  }

  const phoneValid = validatePhone();
  if (!phoneValid) {
    document.getElementById('form-phone').focus();
    return;
  }

  const countryCode = document.getElementById('form-country-code').value;
  const phoneDigits = document.getElementById('form-phone').value.replace(/\D/g, '');

  const formData = {
    name: nameInput.value.trim(),
    email: document.getElementById('form-email').value.trim(),
    phone: phoneDigits ? (countryCode + ' ' + phoneDigits) : '',
    service: document.getElementById('form-service').value,
    message: document.getElementById('form-message').value
  };

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span>Sending...</span>';
  submitBtn.disabled = true;

  const scriptURL = 'https://script.google.com/macros/s/AKfycbwzyM9_eYN0qnSho47lJSlEoblXGKDI3Xlx3v8dYmJxwBrdfjybaVRpaLbSHsebQJoj_w/exec';

  fetch(scriptURL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData)
  })
  .then(() => {
    document.getElementById('audit-form').classList.add('hidden');
    document.getElementById('form-success').classList.remove('hidden');
    event.target.reset();
    submitBtn.innerHTML = originalBtnText;
    submitBtn.disabled = false;
  })
  .catch(() => {
    document.getElementById('audit-form').classList.add('hidden');
    document.getElementById('form-success').classList.remove('hidden');
    event.target.reset();
    submitBtn.innerHTML = originalBtnText;
    submitBtn.disabled = false;
  });
}
