// AI chatbot widget: floating bubble + panel, backed by /chatbot/chat.php
// (server-side OpenRouter proxy — API key never touches this file).
// Structured contact-capture flow submits directly to the same Apps Script
// Web App the main contact form uses, tagged source_page: "AI Chatbot".
(function () {
  var LEADS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz1kckQ5vIQnR2mNQ7ChucD6Qry5yTe_GowfBl3qK8ox6IUqwYaimijc8NW7JLZ3V8D/exec';

  var history = []; // [{role, content}]
  var captureState = null; // null = normal chat; object = mid contact-capture flow
  var panelOpenedOnce = false;

  function $(id) { return document.getElementById(id); }

  function scrollToBottom() {
    var el = $('chatbot-messages');
    el.scrollTop = el.scrollHeight;
  }

  function addMessage(role, text) {
    var el = $('chatbot-messages');
    var wrap = document.createElement('div');
    wrap.className = 'flex ' + (role === 'user' ? 'justify-end' : 'justify-start');
    var bubble = document.createElement('div');
    bubble.className = 'max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ' +
      (role === 'user'
        ? 'bg-primary text-white rounded-br-sm'
        : 'bg-white border border-border text-text-body rounded-bl-sm');
    bubble.textContent = text;
    wrap.appendChild(bubble);
    el.appendChild(wrap);
    scrollToBottom();
  }

  function addTyping() {
    var el = $('chatbot-messages');
    var wrap = document.createElement('div');
    wrap.className = 'flex justify-start';
    wrap.id = 'chatbot-typing';
    wrap.innerHTML =
      '<div class="bg-white border border-border rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1 items-center">' +
      '<span class="w-1.5 h-1.5 rounded-full bg-text-body/40 animate-bounce" style="animation-delay:0ms"></span>' +
      '<span class="w-1.5 h-1.5 rounded-full bg-text-body/40 animate-bounce" style="animation-delay:150ms"></span>' +
      '<span class="w-1.5 h-1.5 rounded-full bg-text-body/40 animate-bounce" style="animation-delay:300ms"></span>' +
      '</div>';
    el.appendChild(wrap);
    scrollToBottom();
  }

  function removeTyping() {
    var t = $('chatbot-typing');
    if (t) t.remove();
  }

  function setQuickReplies(options, onPick) {
    var el = $('chatbot-quick-replies');
    el.innerHTML = '';
    if (!options || !options.length) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    options.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = opt;
      btn.className = 'px-3 py-1.5 rounded-full border border-primary/30 text-primary text-xs font-medium hover:bg-primary hover:text-white active:scale-95 transition-all';
      btn.addEventListener('click', function () {
        clearQuickReplies();
        onPick(opt);
      });
      el.appendChild(btn);
    });
  }

  function clearQuickReplies() {
    var el = $('chatbot-quick-replies');
    el.innerHTML = '';
    el.classList.add('hidden');
  }

  function setInputEnabled(enabled) {
    $('chatbot-input').disabled = !enabled;
    $('chatbot-send-btn').disabled = !enabled;
  }

  // ---- Normal AI-backed chat ----
  function sendToAI(userText) {
    addMessage('user', userText);
    var historyBeforeThisTurn = history.slice();
    history.push({ role: 'user', content: userText });
    addTyping();
    setInputEnabled(false);

    fetch('/chatbot/chat.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText, history: historyBeforeThisTurn })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        removeTyping();
        setInputEnabled(true);
        $('chatbot-input').focus();
        if (data && data.reply) {
          addMessage('bot', data.reply);
          history.push({ role: 'assistant', content: data.reply });
          if (data.capture) {
            startCaptureFlow();
          }
        } else {
          addMessage('bot', "Sorry, something went wrong on my end. Feel free to reach out directly on WhatsApp instead.");
        }
      })
      .catch(function () {
        removeTyping();
        setInputEnabled(true);
        addMessage('bot', "Sorry, I'm having trouble responding right now. Feel free to reach out directly on WhatsApp instead.");
      });
  }

  // ---- Structured contact-capture flow (deterministic, mostly quick-reply) ----
  function startCaptureFlow() {
    captureState = { step: 'name' };
    setTimeout(function () {
      addMessage('bot', "What's your name?");
    }, 400);
  }

  function askMethod() {
    captureState.step = 'method';
    addMessage('bot', 'How would you prefer to connect?');
    setQuickReplies(['Phone Call', 'WhatsApp', 'Email'], function (choice) {
      addMessage('user', choice);
      captureState.method = choice;
      captureState.step = 'detail';
      var label = choice === 'Email' ? 'your email address' : 'the best number to reach you on';
      addMessage('bot', "What's " + label + "?");
    });
  }

  function askTime() {
    captureState.step = 'time';
    addMessage('bot', 'What time works best to talk?');
    setQuickReplies(['Morning', 'Afternoon', 'Evening'], function (choice) {
      addMessage('user', choice);
      captureState.time = choice;
      askPurpose();
    });
  }

  function askPurpose() {
    captureState.step = 'purpose';
    addMessage('bot', "Last thing — what's this about?");
    setQuickReplies(['Discuss a project', 'Ask about services', 'Explore collaboration', 'Other'], function (choice) {
      addMessage('user', choice);
      if (choice === 'Other') {
        captureState.step = 'purpose-other';
        addMessage('bot', 'Go ahead, tell me a bit more.');
      } else {
        captureState.purpose = choice;
        submitCapture();
      }
    });
  }

  function submitCapture() {
    addMessage('bot', "Thanks! I've got everything I need — Shashwat will be in touch soon.");

    var phone = (captureState.method === 'Phone Call' || captureState.method === 'WhatsApp') ? captureState.detail : '';
    var email = captureState.method === 'Email' ? captureState.detail : '';

    var payload = {
      name: captureState.name || '',
      phone: phone,
      email: email,
      service: captureState.purpose || '',
      budget: '',
      message: 'Preferred contact method: ' + captureState.method + '. Preferred time: ' + captureState.time + '.',
      source_page: 'AI Chatbot',
      website: '' // honeypot field, always empty from this flow — no visible form for a bot to fill
    };

    fetch(LEADS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).catch(function () {
      // Lead confirmation already shown in chat; a network failure here is silent
      // rather than confusing the visitor with a second, contradictory message.
    });

    captureState = null;
  }

  // Free-text answers within the capture flow (name, phone/email, "Other" detail)
  // are routed here instead of to the AI, based on captureState.step.
  function handleFormSubmit(e) {
    e.preventDefault();
    var input = $('chatbot-input');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';

    if (captureState && captureState.step === 'name') {
      addMessage('user', text);
      captureState.name = text;
      askMethod();
      return;
    }
    if (captureState && captureState.step === 'detail') {
      addMessage('user', text);
      captureState.detail = text;
      askTime();
      return;
    }
    if (captureState && captureState.step === 'purpose-other') {
      addMessage('user', text);
      captureState.purpose = text;
      submitCapture();
      return;
    }

    sendToAI(text);
  }

  function openPanel() {
    $('chatbot-panel').classList.remove('hidden');
    $('chatbot-icon-chat').classList.add('hidden');
    $('chatbot-icon-close').classList.remove('hidden');
    $('chatbot-toggle').setAttribute('aria-expanded', 'true');
    if (!panelOpenedOnce) {
      panelOpenedOnce = true;
      addMessage('bot', "Hi! I'm here to answer questions about Shashwat's background, services, and experience. Ask me anything, or let me know if you'd like to connect!");
    }
    $('chatbot-input').focus();
  }

  function closePanel() {
    $('chatbot-panel').classList.add('hidden');
    $('chatbot-icon-chat').classList.remove('hidden');
    $('chatbot-icon-close').classList.add('hidden');
    $('chatbot-toggle').setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = $('chatbot-toggle');
    if (!toggle) return; // widget markup not present on this page — no-op

    toggle.addEventListener('click', function () {
      var isOpen = !$('chatbot-panel').classList.contains('hidden');
      if (isOpen) { closePanel(); } else { openPanel(); }
    });
    $('chatbot-close-btn').addEventListener('click', closePanel);
    $('chatbot-form').addEventListener('submit', handleFormSubmit);
  });
})();
