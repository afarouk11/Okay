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
const hologram        = document.getElementById('hologram');
const statusDot       = document.getElementById('status-dot');
const statusText      = document.getElementById('status-text');
const statusTitle     = document.getElementById('status-title');
const statusHint      = document.getElementById('status-hint');
const endBtn          = document.getElementById('end-btn');
const toast           = document.getElementById('toast');
const transcriptPanel = document.getElementById('transcript');
const vizCanvas       = document.getElementById('viz-canvas');
const vizCtx          = vizCanvas.getContext('2d');

// ── State ─────────────────────────────────────────────────────────────────────
let orbState    = 'idle';  // 'idle' | 'greeting' | 'active'
let porcupine   = null;
let conversation= null;
let toastTimer  = null;
let volumeRafId = null;  // requestAnimationFrame handle for volume tracking

// Maximum additional scale applied at peak volume (orb grows by up to 35 %)
const VOLUME_SCALE_FACTOR = 0.35;

// ── Canvas visualizer ─────────────────────────────────────────────────────────
const BAR_COUNT              = 80;
const INNER_R                = 58;    // px — sits just outside the 90px-diameter orb
const MAX_BAR_LEN            = 68;    // px — tallest possible bar
const VIZ_CX                 = 150;
const VIZ_CY                 = 150;
const AMPLITUDE_SMOOTHING    = 0.18;  // lerp factor: higher = faster response
const IDLE_WAVE_FREQ         = 6;     // sine-wave cycles across all bars (idle)
const IDLE_ANIM_SPEED        = 0.001; // radians per millisecond (idle rotation)
const GREETING_WAVE_FREQ     = 8;     // denser ripple during greeting/connecting
const GREETING_ANIM_SPEED    = 0.004; // faster spin during greeting state
let   canvasRafId            = null;
const smoothAmps             = new Float32Array(BAR_COUNT);

function _idleAmps(t) {
  const a = new Float32Array(BAR_COUNT);
  for (let i = 0; i < BAR_COUNT; i++) {
    const p = (i / BAR_COUNT) * Math.PI * IDLE_WAVE_FREQ + t * IDLE_ANIM_SPEED;
    a[i] = 0.04 + 0.06 * (0.5 + 0.5 * Math.sin(p));
  }
  return a;
}

function _greetingAmps(t) {
  const a = new Float32Array(BAR_COUNT);
  for (let i = 0; i < BAR_COUNT; i++) {
    const p = (i / BAR_COUNT) * Math.PI * GREETING_WAVE_FREQ + t * GREETING_ANIM_SPEED;
    a[i] = 0.1 + 0.22 * Math.abs(Math.sin(p));
  }
  return a;
}

function _freqAmps(fd) {
  const a    = new Float32Array(BAR_COUNT);
  const step = Math.max(1, Math.floor((fd.length >> 1) / BAR_COUNT));
  for (let i = 0; i < BAR_COUNT; i++) {
    a[i] = fd[Math.min(i * step, fd.length - 1)] / 255;
  }
  return a;
}

function _vizTick(t) {
  let target, alpha;
  if (orbState === 'idle') {
    target = _idleAmps(t);    alpha = 0.65;
  } else if (orbState === 'greeting') {
    target = _greetingAmps(t); alpha = 0.85;
  } else {
    const fd = conversation?.getOutputByteFrequencyData?.();
    target   = fd?.length ? _freqAmps(fd) : _greetingAmps(t);
    alpha    = 1;
  }

  for (let i = 0; i < BAR_COUNT; i++) {
    smoothAmps[i] += (target[i] - smoothAmps[i]) * AMPLITUDE_SMOOTHING;
  }

  vizCtx.clearRect(0, 0, 300, 300);
  for (let i = 0; i < BAR_COUNT; i++) {
    const ang = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
    const v   = smoothAmps[i];
    const len = v * MAX_BAR_LEN;
    if (len < 0.3) continue;
    const x1 = VIZ_CX + Math.cos(ang) * INNER_R;
    const y1 = VIZ_CY + Math.sin(ang) * INNER_R;
    const x2 = VIZ_CX + Math.cos(ang) * (INNER_R + len);
    const y2 = VIZ_CY + Math.sin(ang) * (INNER_R + len);
    vizCtx.strokeStyle = `rgba(0,212,255,${((0.3 + v * 0.7) * alpha).toFixed(2)})`;
    vizCtx.lineWidth   = 2;
    vizCtx.lineCap     = 'round';
    vizCtx.beginPath();
    vizCtx.moveTo(x1, y1);
    vizCtx.lineTo(x2, y2);
    vizCtx.stroke();
  }

  canvasRafId = requestAnimationFrame(_vizTick);
}

function startCanvasLoop() {
  if (canvasRafId) return;
  canvasRafId = requestAnimationFrame(_vizTick);
}

// ── Transcript ────────────────────────────────────────────────────────────────
let transcriptTimer = null;

function showTranscript(text) {
  clearTimeout(transcriptTimer);
  transcriptPanel.textContent = text;
  transcriptPanel.classList.add('visible');
  transcriptTimer = setTimeout(() => transcriptPanel.classList.remove('visible'), 8000);
}

function clearTranscript() {
  clearTimeout(transcriptTimer);
  transcriptPanel.classList.remove('visible');
}

// ── Volume tracking ───────────────────────────────────────────────────────────

/**
 * Poll the ElevenLabs output analyser every animation frame and map
 * the computed mean amplitude to the --orb-scale CSS variable so the orb
 * pulses in sync with the AI's speech.
 */
function startVolumeTracking() {
  stopVolumeTracking();

  function tick() {
    if (!conversation) { stopVolumeTracking(); return; }

    const freqData = conversation.getOutputByteFrequencyData?.();
    if (freqData && freqData.length > 0) {
      // Compute mean amplitude of the lower half (voice frequencies)
      let sum = 0;
      const len = Math.floor(freqData.length / 2);
      for (let i = 0; i < len; i++) sum += freqData[i];
      const meanAmplitude = sum / (len * 255);                    // normalise 0..1
      const scale = 1 + meanAmplitude * VOLUME_SCALE_FACTOR;      // map to 1.00 – 1.35
      hologram.style.setProperty('--orb-scale', scale.toFixed(3));
    }

    volumeRafId = requestAnimationFrame(tick);
  }

  volumeRafId = requestAnimationFrame(tick);
}

function stopVolumeTracking() {
  if (volumeRafId !== null) {
    cancelAnimationFrame(volumeRafId);
    volumeRafId = null;
  }
  hologram.style.setProperty('--orb-scale', '1');
}

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
      stopVolumeTracking();
      clearTranscript();
      conversation = null;
      setOrbState('idle');
      setStatus('SYSTEMS ONLINE', 'online');
      await armWakeWord();
    },

    // Volume-reactive orb: start rAF loop when AI speaks, stop when it stops
    onModeChange: ({ mode }) => {
      hologram.classList.toggle('speaking', mode === 'speaking');
      if (mode === 'speaking') {
        startVolumeTracking();
      } else {
        stopVolumeTracking();
      }
    },

    // Show AI's spoken text as an on-screen subtitle
    onMessage: (msg) => {
      const text = msg?.agent_response
        ?? (msg?.source === 'ai' ? msg?.message : null)
        ?? null;
      if (typeof text === 'string' && text.trim()) showTranscript(text);
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

  // Brief white flash on the orb to acknowledge the wake word
  hologram.classList.add('wake-flash');
  setTimeout(() => hologram.classList.remove('wake-flash'), 600);

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
    stopVolumeTracking();
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

// Start the ambient canvas visualizer immediately — shows idle animation
// before keys load, then transitions to live frequency data during sessions.
startCanvasLoop();
