/**
 * Jarvis Floating Widget
 *
 * A bottom-right chat button that appears on every page.
 * Understands navigation intents so students can say "open flashcards" and
 * Jarvis will navigate to the right Next.js route automatically.
 *
 * This keeps older pages working while the product finishes moving away from
 * the legacy single-file `index.html` experience.
 */

(function () {
  'use strict';

  // ── Navigation intent map ──────────────────────────────────────────────────
  const NAV_INTENTS = [
    { keywords: ['flashcard', 'flash card', 'revision card', 'flash cards'],
      url: '/dashboard', label: '📇 Flashcards & Revision' },
    { keywords: ['past paper', 'past papers', 'exam paper', 'exam papers', 'past exam', 'old paper'],
      url: '/papers', label: '📄 Past Papers' },
    { keywords: ['practice question', 'question bank', 'practice paper', 'practice questions', 'question generator'],
      url: '/questions', label: '📝 Practice Questions' },
    { keywords: ['progress', 'my progress', 'analytics', 'my stats', 'dashboard stats'],
      url: '/dashboard', label: '📊 Progress' },
    { keywords: ['formula', 'formula sheet', 'formula sheets', 'formulas'],
      url: '/formulas', label: '📐 Formula Sheets' },
    { keywords: ['glossary', 'definitions', 'key terms', 'terminology'],
      url: '/formulas?tab=glossary', label: '📖 Glossary' },
    { keywords: ['calculator', 'calc'],
      url: '/formulas?tab=calculator', label: '🔢 Calculator' },
    { keywords: ['exam sim', 'exam simulator', 'mock exam', 'timed exam', 'simulated exam'],
      url: '/exam-sim', label: '⏱️ Exam Simulator' },
    { keywords: ['timetable', 'revision timetable', 'study plan', 'study schedule', 'revision plan'],
      url: '/plan', label: '🗓️ Revision Plan' },
    { keywords: ['mind map', 'mindmap', 'concept map', 'topic map'],
      url: '/mindmap', label: '🧠 Mind Map' },
    { keywords: ['notes', 'my notes'],
      url: '/notes', label: '📓 My Notes' },
    { keywords: ['lesson', 'lessons', 'ai lesson', 'ai lessons', 'watch lesson'],
      url: '/lessons', label: '🎓 AI Lessons' },
    { keywords: ['maths assistant', 'ai tutor', 'jarvis chat', 'jarvis page', 'open jarvis'],
      url: '/jarvis', label: '🤖 J.A.R.V.I.S.' },
    { keywords: ['tutor', 'chat with ai', 'ai chat', 'ask question', 'ai maths'],
      url: '/chat', label: '🤖 AI Maths Assistant' },
    { keywords: ['home', 'dashboard', 'go home', 'main page'],
      url: '/dashboard', label: '🏠 Dashboard' },
    { keywords: ['settings', 'account settings', 'profile'],
      url: '/settings', label: '⚙️ Settings' },
    { keywords: ['exam countdown', 'my exam', 'exam date'],
      url: '/dashboard', label: '📅 Exam Dashboard' },
    { keywords: ['predict', 'grade prediction', 'predicted grade'],
      url: '/dashboard', label: '✨ Exam Dashboard' },
    { keywords: ['photo', 'photo question', 'scan question', 'camera'],
      url: '/chat', label: '📷 Photo Question Help' },
    { keywords: ['pricing', 'subscription', 'upgrade', 'premium', 'pro plan', 'plans'],
      url: '/pricing', label: '💎 Pricing' },
  ];

  // Quick suggestion chips shown at the start
  const SUGGESTIONS = [
    'Open flashcards',
    'Past papers',
    'Practice questions',
    'Formula sheets',
    'Mind map',
  ];

  // Canned AI response map for common intents
  const RESPONSES = {
    greeting: [
      "Hi! I'm J.A.R.V.I.S. 👋 I can navigate you anywhere on Synaptiq — just tell me what you need!",
      "Hello! Ready to help you study. Where would you like to go? 🚀",
    ],
    notFound: [
      "I'm not sure where to take you for that. Try asking for flashcards, past papers, practice questions, or your progress dashboard!",
      "Hmm, I couldn't find that section. You can ask me for things like flashcards, past papers, formula sheets, or the AI tutor.",
    ],
    navigate: (label) => `Opening ${label} for you… 🚀`,
  };

  // Delay (ms) between showing the navigation message and actually navigating,
  // so the student can read the confirmation before the page changes.
  const NAVIGATION_DELAY_MS = 900;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function detectIntent(text) {
    const lower = text.toLowerCase().replace(/['']/g, "'");
    for (const intent of NAV_INTENTS) {
      for (const kw of intent.keywords) {
        if (lower.includes(kw)) return intent;
      }
    }
    return null;
  }

  function isGreeting(text) {
    const lower = text.toLowerCase().trim();
    return /^(hi|hello|hey|yo|sup|good (morning|afternoon|evening)|what can you do|help me|what do you do)/.test(lower);
  }

  // Navigate using canonical Next.js routes rather than the old index.html SPA.
  function navigateTo(intent) {
    window.location.href = intent.url || '/dashboard';
  }

  // ── Build widget DOM ───────────────────────────────────────────────────────
  function buildWidget() {
    // Inject CSS link if not on a page that already has it
    if (!document.querySelector('link[href*="jarvis-widget.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/src/styles/jarvis-widget.css';
      document.head.appendChild(link);
    }

    // Floating button
    const btn = document.createElement('button');
    btn.id = 'jarvis-widget-btn';
    btn.setAttribute('aria-label', 'Open Jarvis AI assistant');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'jarvis-widget-panel');
    btn.innerHTML = '<div class="jw-orb" aria-hidden="true"></div>';
    document.body.appendChild(btn);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'jarvis-widget-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Jarvis AI assistant');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
      <div class="jw-header">
        <div class="jw-header-orb" aria-hidden="true"></div>
        <div class="jw-header-info">
          <div class="jw-header-name">J.A.R.V.I.S.</div>
          <div class="jw-header-sub">Your Synaptiq AI Guide</div>
        </div>
        <button class="jw-close-btn" id="jw-close" aria-label="Close Jarvis">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="jw-messages" id="jw-messages" aria-live="polite" aria-label="Conversation"></div>
      <div class="jw-suggestions" id="jw-suggestions"></div>
      <div class="jw-input-area">
        <textarea id="jw-input" rows="1"
          placeholder="Where do you want to go? e.g. 'flashcards'"
          aria-label="Type your request"
          maxlength="500"></textarea>
        <button id="jw-send-btn" aria-label="Send">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>`;
    document.body.appendChild(panel);

    return { btn, panel };
  }

  // ── Widget logic ───────────────────────────────────────────────────────────
  function initWidget() {
    const { btn, panel } = buildWidget();
    const messagesEl    = panel.querySelector('#jw-messages');
    const inputEl       = panel.querySelector('#jw-input');
    const sendBtnEl     = panel.querySelector('#jw-send-btn');
    const closeBtn      = panel.querySelector('#jw-close');
    const suggestionsEl = panel.querySelector('#jw-suggestions');

    let isOpen = false;

    // Suggestion chips
    SUGGESTIONS.forEach(text => {
      const chip = document.createElement('button');
      chip.className = 'jw-suggestion-btn';
      chip.textContent = text;
      chip.addEventListener('click', () => { handleSend(text); });
      suggestionsEl.appendChild(chip);
    });

    // Welcome message
    function showWelcome() {
      addAIMessage(rand(RESPONSES.greeting));
    }

    // Open / close
    function openPanel() {
      isOpen = true;
      panel.classList.add('jw-visible');
      panel.setAttribute('aria-hidden', 'false');
      btn.setAttribute('aria-expanded', 'true');
      btn.classList.add('jw-open');
      if (messagesEl.children.length === 0) showWelcome();
      setTimeout(() => inputEl.focus(), 50);
    }

    function closePanel() {
      isOpen = false;
      panel.classList.remove('jw-visible');
      panel.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('jw-open');
      btn.focus();
    }

    btn.addEventListener('click', () => isOpen ? closePanel() : openPanel());
    closeBtn.addEventListener('click', closePanel);

    // Close on outside click
    document.addEventListener('click', e => {
      if (isOpen && !panel.contains(e.target) && e.target !== btn) {
        closePanel();
      }
    });

    // Escape key closes
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) closePanel();
    });

    // ── Message helpers ──────────────────────────────────────────────────────
    function addMessage(role, html) {
      // Hide suggestions after first user message
      if (role === 'user') suggestionsEl.style.display = 'none';

      const div = document.createElement('div');
      div.className = `jw-msg jw-${role}`;
      div.innerHTML = `<div class="jw-msg-bubble">${html}</div>`;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return div;
    }

    function addAIMessage(text, navIntent) {
      // Sanitize plain text before inserting as HTML
      const safe = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      let html = `<span>${safe}</span>`;
      if (navIntent) {
        html += `<br><button class="jw-nav-chip" data-action="navigate">
          ↗ ${navIntent.label}
        </button>`;
      }
      const msgEl = addMessage('ai', html);
      if (navIntent) {
        msgEl.querySelector('[data-action="navigate"]').addEventListener('click', () => {
          navigateTo(navIntent);
        });
      }
    }

    function showTyping() {
      const div = document.createElement('div');
      div.id = 'jw-typing';
      div.className = 'jw-msg jw-ai';
      div.innerHTML = `<div class="jw-typing">
        <div class="jw-typing-dot"></div>
        <div class="jw-typing-dot"></div>
        <div class="jw-typing-dot"></div>
      </div>`;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function removeTyping() {
      document.getElementById('jw-typing')?.remove();
    }

    // ── Handle user send ─────────────────────────────────────────────────────
    function handleSend(rawText) {
      const text = rawText.trim();
      if (!text) return;

      inputEl.value = '';
      autoResize();
      addMessage('user', escHtml(text));

      // Detect intent
      const intent = detectIntent(text);

      if (isGreeting(text)) {
        setTimeout(() => addAIMessage(rand(RESPONSES.greeting)), 220);
        return;
      }

      if (intent) {
        showTyping();
        setTimeout(() => {
          removeTyping();
          addAIMessage(RESPONSES.navigate(intent.label), intent);
          // Auto-navigate after brief delay so user can read the confirmation
          setTimeout(() => navigateTo(intent), NAVIGATION_DELAY_MS);
        }, 500);
        return;
      }

      // No navigation intent — give helpful fallback
      showTyping();
      setTimeout(() => {
        removeTyping();
        addAIMessage(rand(RESPONSES.notFound));
      }, 600);
    }

    // ── Input helpers ────────────────────────────────────────────────────────
    function autoResize() {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
    }

    function escHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    }

    sendBtnEl.addEventListener('click', () => handleSend(inputEl.value));

    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend(inputEl.value);
      }
    });

    inputEl.addEventListener('input', autoResize);
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
