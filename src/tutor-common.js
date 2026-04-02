/**
 * Shared utilities for tutor pages (lessons.html, questions.html).
 *
 * Provides: initAuth, callClaude, getReply, showToast, sanitizeHTML
 *
 * All pages must include the Supabase UMD CDN script before importing
 * this module so that window.supabase is available:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 */

// ── Module-level user state ───────────────────────────────────────────────────
let _currentUser = null;

/** Return the authenticated user object (or null if not yet initialised). */
export function getUser() {
  return _currentUser;
}

/**
 * Initialise authentication.
 *
 * Checks Supabase session first, then falls back to localStorage tokens.
 * Removes the #auth-overlay element on success, or redirects to / if the
 * visitor is not logged in.
 *
 * @returns {Promise<object|null>} resolved currentUser, or null (+ redirect)
 */
export async function initAuth() {
  const supabaseUrl  = window.SUPABASE_URL  || '';
  const supabaseAnon = window.SUPABASE_ANON_KEY || '';

  if (supabaseUrl && supabaseAnon && window.supabase) {
    try {
      const client = window.supabase.createClient(supabaseUrl, supabaseAnon);
      const { data: { session } } = await client.auth.getSession();
      if (session) {
        _currentUser = { token: session.access_token, ...session.user };
      }
    } catch (_) {}
  }

  if (!_currentUser) {
    try {
      const token = localStorage.getItem('synaptiq_token');
      if (token) {
        _currentUser = { token };
      } else {
        const saved = localStorage.getItem('synaptiq_user');
        if (saved) _currentUser = JSON.parse(saved);
      }
    } catch (_) {}
  }

  const overlay = document.getElementById('auth-overlay');
  if (!_currentUser) {
    window.location.href = '/';
    return null;
  }
  if (overlay) overlay.remove();
  return _currentUser;
}

/**
 * Call the /api/chat endpoint (Claude).
 *
 * Throws an Error on non-ok responses, including rate-limit errors.
 * Rate-limit errors have `err.code === 'daily_limit_exceeded'`.
 *
 * @param {Array}  messages     Anthropic messages array
 * @param {string} [system]     System prompt
 * @param {number} [maxTokens]  Max tokens (default 1500)
 * @returns {Promise<object>}   Raw Anthropic response object
 */
export async function callClaude(messages, system, maxTokens = 1500) {
  const body = { max_tokens: maxTokens, messages };
  if (system) body.system = system;

  const headers = { 'Content-Type': 'application/json' };
  if (_currentUser?.token) headers['Authorization'] = 'Bearer ' + _currentUser.token;

  const r    = await fetch('/api/chat', { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await r.text();

  let data;
  try { data = JSON.parse(text); } catch (_) {
    throw new Error('Bad response (' + r.status + ')');
  }

  if (!r.ok) {
    const err = new Error(data.error || 'API error ' + r.status);
    if (data.code) err.code = data.code;
    throw err;
  }
  if (data.error) throw new Error(data.error.message || 'Anthropic error');
  return data;
}

/**
 * Extract the text content from an Anthropic response.
 * @param {object} data
 * @returns {string}
 */
export function getReply(data) {
  return data.content && data.content[0] ? data.content[0].text : '';
}

/**
 * Show a temporary toast notification.
 * Requires a #toast element with the `.toast` / `.toast.show` CSS classes.
 *
 * @param {string} msg
 * @param {number} [durationMs=3000]
 */
export function showToast(msg, durationMs = 3000) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), durationMs);
}

/**
 * Escape a string for safe insertion into innerHTML.
 * @param {string} str
 * @returns {string}
 */
export function sanitizeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
