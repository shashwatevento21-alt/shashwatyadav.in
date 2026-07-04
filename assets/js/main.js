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

// Form submission handler - Connected to Google Sheets (Contact page only)
function handleFormSubmission(event) {
  event.preventDefault();

  const formData = {
    name: document.getElementById('form-name').value,
    email: document.getElementById('form-email').value,
    phone: document.getElementById('form-phone').value,
    service: document.getElementById('form-service').value,
    message: document.getElementById('form-message').value
  };

  if (!formData.name || !formData.email) {
    alert('Please fill in all required fields');
    return;
  }

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
