/**
 * J.A.R.V.I.S. — Vanilla-JS "Ear → Brain → Mouth" pipeline
 *
 * Wake word:  Picovoice Porcupine Web  (@picovoice/porcupine-web + @picovoice/web-voice-processor)
 * Voice AI:   ElevenLabs Conversational AI  (@11labs/client)
 *
 * API keys are injected into jarvis.html at build time by scripts/build.mjs:
 *   PICOVOICE_KEY_PLACEHOLDER   →  meta[name="picovoice-key"]
 *   ELEVEN_AGENT_ID_PLACEHOLDER →  meta[name="eleven-agent-id"]
 *
 * ElevenLabs CDN: https://esm.sh/@11labs/client
 * Porcupine CDN:  https://esm.sh/@picovoice/porcupine-web  +  https://esm.sh/@picovoice/web-voice-processor
 * Model files:    https://unpkg.com/@picovoice/porcupine-web@3/dist/  (WASM + .pv model)
 */

// ── Keys (injected by build pipeline) ────────────────────────────────────────
const PICOVOICE_KEY   = document.querySelector('meta[name="picovoice-key"]')?.content  ?? '';
const ELEVEN_AGENT_ID = document.querySelector('meta[name="eleven-agent-id"]')?.content ?? '';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const hologram   = document.getElementById('hologram');
const statusDot  = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const statusTitle= document.getElementById('status-title');
const statusHint = document.getElementById('status-hint');
const endBtn     = document.getElementById('end-btn');
const toast      = document.getElementById('toast');

// ── State ─────────────────────────────────────────────────────────────────────
let orbState    = 'idle';  // 'idle' | 'greeting' | 'active'
let porcupine   = null;
let conversation= null;
let toastTimer  = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function setOrbState(state) {
  orbState = state;
  hologram.className = `hologram-container ${state}`;

  const titles = {
    idle:     'J.A.R.V.I.S.',
    greeting: 'CONNECTING...',
    active:   'SESSION ACTIVE',
  };
  statusTitle.textContent = titles[state] ?? 'J.A.R.V.I.S.';

  const dotClass = { idle: '', greeting: 'active', active: 'active' }[state] ?? '';
  statusDot.className = `status-dot ${dotClass}`;

  statusHint.style.opacity = state === 'idle' ? '0.6' : '0';
  endBtn.classList.toggle('hidden', state !== 'active');
}

function showToast(msg, durationMs = 5000) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), durationMs);
}

function setStatus(text, dotVariant = '') {
  statusText.textContent = text;
  statusDot.className = `status-dot ${dotVariant}`;
}

// ── ElevenLabs ────────────────────────────────────────────────────────────────

/**
 * Start a Conversational AI session with the configured ElevenLabs agent.
 * On disconnect we re-arm the Porcupine wake-word listener.
 */
async function startConversation() {
  const { Conversation } = await import('https://esm.sh/@11labs/client');

  conversation = await Conversation.startSession({
    agentId: ELEVEN_AGENT_ID,

    onConnect: () => {
      setOrbState('active');
      setStatus('SESSION ACTIVE', 'active');
    },

    onDisconnect: async () => {
      conversation = null;
      setOrbState('idle');
      setStatus('SYSTEMS ONLINE', 'online');
      await armWakeWord();
    },

    // Visual feedback: ring in while AI is speaking
    onModeChange: ({ mode }) => {
      hologram.classList.toggle('speaking', mode === 'speaking');
    },

    onError: (errMsg) => {
      console.error('[ElevenLabs]', errMsg);
      showToast(`Connection error — ${errMsg}`);
    },
  });
}

// ── Porcupine wake-word ───────────────────────────────────────────────────────

/**
 * Subscribe Porcupine to the voice processor so it listens for "Jarvis".
 * Called on page load and again after each session ends.
 */
async function armWakeWord() {
  if (!porcupine) return;
  const { WebVoiceProcessor } = await import('https://esm.sh/@picovoice/web-voice-processor@2');
  try {
    await WebVoiceProcessor.subscribe(porcupine);
  } catch (err) {
    // Already subscribed — safe to ignore
    if (!String(err).includes('already')) console.warn('[VoiceProcessor]', err);
  }
}

/**
 * Unsubscribe Porcupine while ElevenLabs is active (prevents mic echo).
 */
async function disarmWakeWord() {
  if (!porcupine) return;
  const { WebVoiceProcessor } = await import('https://esm.sh/@picovoice/web-voice-processor@2');
  await WebVoiceProcessor.unsubscribe(porcupine);
}

/**
 * Called by Porcupine when the "Jarvis" keyword is detected.
 */
async function handleWakeWord() {
  if (orbState !== 'idle') return;  // already in a session

  setOrbState('greeting');
  setStatus('CONNECTING...', 'active');

  try {
    await disarmWakeWord();
    await startConversation();
  } catch (err) {
    console.error('[JARVIS] Session start failed:', err);
    showToast('Could not reach ElevenLabs — check your agent ID and network.');
    setOrbState('idle');
    setStatus('SYSTEMS ONLINE', 'online');
    await armWakeWord();
  }
}

// ── Manual end-session button ─────────────────────────────────────────────────

endBtn.addEventListener('click', async () => {
  if (conversation) {
    await conversation.endSession();
    // onDisconnect fires automatically → re-arms wake word
  }
});

// ── Initialisation ────────────────────────────────────────────────────────────

async function init() {
  // Guard: keys not yet configured
  if (!PICOVOICE_KEY || PICOVOICE_KEY === 'PICOVOICE_KEY_PLACEHOLDER') {
    setStatus('PICOVOICE KEY NOT SET', 'error');
    showToast('Set PICOVOICE_KEY in Vercel environment variables.', 0);
    return;
  }
  if (!ELEVEN_AGENT_ID || ELEVEN_AGENT_ID === 'ELEVEN_AGENT_ID_PLACEHOLDER') {
    setStatus('AGENT ID NOT SET', 'error');
    showToast('Set ELEVEN_AGENT_ID in Vercel environment variables.', 0);
    return;
  }

  setStatus('LOADING ENGINE...', '');

  try {
    const { PorcupineWorker } = await import('https://esm.sh/@picovoice/porcupine-web@3');

    // Model files (WASM + .pv) are fetched from the unpkg CDN at runtime.
    // If you self-host, change publicPath to e.g. '/assets/porcupine/'.
    const porcupineModel = {
      publicPath: 'https://unpkg.com/@picovoice/porcupine-web@3/dist/',
      forceWrite:  false,
    };

    porcupine = await PorcupineWorker.create(
      PICOVOICE_KEY,
      [{ builtin: 'Jarvis', sensitivity: 0.6 }],
      handleWakeWord,   // fires on keyword detection
      porcupineModel,
    );

    await armWakeWord();
    setStatus('SYSTEMS ONLINE', 'online');

  } catch (err) {
    console.error('[Porcupine] Init failed:', err);
    const hint = err?.message?.includes('InvalidAccessError')
      ? 'Microphone access denied.'
      : `Wake-word engine failed: ${err?.message ?? err}`;
    setStatus('INIT ERROR', 'error');
    showToast(hint, 0);
  }
}

init();
