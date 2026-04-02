/**
 * J.A.R.V.I.S. — Vanilla-JS "Ear → Brain → Mouth" pipeline
 *
 * Wake word:  Web Speech API (SpeechRecognition — built into Chrome / Edge)
 * Voice AI:   ElevenLabs Conversational AI  (@elevenlabs/client)
 *
 * Agent config is fetched at runtime from /api/jarvis-config, which returns
 * either a short-lived WebRTC conversation token (preferred) or the plain agent ID.
 *
 * ElevenLabs CDN: https://esm.sh/@elevenlabs/client
 */

// ── DOM refs ──────────────────────────────────────────────────────────────────
const hologram        = document.getElementById('hologram');
const statusDot       = document.getElementById('status-dot');
const statusText      = document.getElementById('status-text');
const statusTitle     = document.getElementById('status-title');
const statusHint      = document.getElementById('status-hint');
const endBtn          = document.getElementById('end-btn');
const micBtn          = document.getElementById('mic-btn');
const micBtnLabel     = document.getElementById('mic-btn-label');
const toast           = document.getElementById('toast');
const transcriptPanel = document.getElementById('transcript');
const vizCanvas       = document.getElementById('viz-canvas');
const vizCtx          = vizCanvas.getContext('2d');

// ── State ─────────────────────────────────────────────────────────────────────
let orbState    = 'idle';  // 'idle' | 'greeting' | 'active'
let recognition = null;
let conversation= null;
let toastTimer  = null;
let volumeRafId = null;  // requestAnimationFrame handle for volume tracking
let jarvisConfig= null;  // { signedUrl? } or { agentId? } — fetched from /api/jarvis-config
let micEnabled  = true;  // whether the wake-word mic is active

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
  micBtn.classList.toggle('hidden', state !== 'idle');
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
 * @param {{ signedUrl?: string, agentId?: string }} config
 */
async function startConversation(config) {
  const { Conversation } = await import('https://esm.sh/@elevenlabs/client@1');

  conversation = await Conversation.startSession({
    ...(config.conversationToken
      ? { conversationToken: config.conversationToken, connectionType: 'webrtc' }
      : { agentId: config.agentId }),

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

// ── Web Speech API wake-word ──────────────────────────────────────────────────

/**
 * Build and configure a SpeechRecognition instance.
 * Each call creates a fresh object — required because recognition.stop()
 * disposes the underlying audio pipeline in some browsers.
 */
function createRecognition() {
  const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!SR) return null;

  const r = new SR();
  r.continuous      = false;   // restart manually; more reliable than continuous=true
  r.interimResults  = false;
  r.lang            = 'en-US';
  r.maxAlternatives = 3;

  r.onresult = (event) => {
    for (let resultIdx = event.resultIndex; resultIdx < event.results.length; resultIdx++) {
      for (let altIdx = 0; altIdx < event.results[resultIdx].length; altIdx++) {
        const transcript = event.results[resultIdx][altIdx].transcript.trim().toLowerCase();
        if (transcript.includes('jarvis')) {
          handleWakeWord();
          return;
        }
      }
    }
    // Word heard but wasn't "Jarvis" — restart immediately
    if (orbState === 'idle') armWakeWord();
  };

  r.onerror = (event) => {
    if (event.error === 'no-speech') {
      // Normal timeout — restart
      if (orbState === 'idle') armWakeWord();
    } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      setStatus('MIC ACCESS DENIED', 'error');
      showToast('Microphone access denied. Allow access and reload the page.', 0);
    } else {
      console.warn('[SpeechRecognition]', event.error);
      if (orbState === 'idle') setTimeout(() => armWakeWord(), 1000);
    }
  };

  r.onend = () => {
    // Restart automatically while idle (handles both normal end and no-speech)
    if (orbState === 'idle') armWakeWord();
  };

  return r;
}

/**
 * Start listening for the "Jarvis" wake word.
 * Called on page load and again after each session ends.
 */
async function armWakeWord() {
  if (!recognition || orbState !== 'idle' || !micEnabled) return;
  try {
    recognition.start();
  } catch (err) {
    // InvalidStateError fires if already started — safe to ignore
    if (err.name !== 'InvalidStateError') console.warn('[SpeechRecognition]', err);
  }
}

/**
 * Stop wake-word listening while ElevenLabs is active (prevents mic conflicts).
 */
async function disarmWakeWord() {
  if (!recognition) return;
  try {
    recognition.abort();
  } catch { /* ignore */ }
}

/**
 * Called when the "Jarvis" keyword is detected in the speech transcript.
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
    await startConversation(jarvisConfig);
  } catch (err) {
    console.error('[JARVIS] Session start failed:', err);
    showToast('Could not reach ElevenLabs — check your agent ID and network.');
    setOrbState('idle');
    setStatus('SYSTEMS ONLINE', 'online');
    await armWakeWord();
  }
}

// ── Mic toggle button ─────────────────────────────────────────────────────────

function updateMicButton() {
  micBtn.classList.toggle('muted', !micEnabled);
  micBtnLabel.textContent = micEnabled ? 'MIC ON' : 'MIC OFF';
  micBtn.setAttribute('aria-label', micEnabled ? 'Mute microphone' : 'Unmute microphone');
}

micBtn.addEventListener('click', async () => {
  micEnabled = !micEnabled;
  updateMicButton();
  try {
    if (micEnabled) {
      await armWakeWord();
    } else {
      await disarmWakeWord();
    }
  } catch (err) {
    console.error('[JARVIS] Mic toggle failed:', err);
    micEnabled = !micEnabled;  // revert state on failure
    updateMicButton();
    showToast('Could not toggle microphone — please try again.');
  }
});

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
  // Fetch agent config at runtime — avoids build-time injection dependency
  try {
    const res = await fetch('/api/jarvis-config');
    if (!res.ok) {
      const { error } = await res.json().catch((parseErr) => {
        console.error('[JARVIS] Config response parse error (HTTP', res.status, '):', parseErr);
        return {};
      });
      setStatus('AGENT ID NOT SET', 'error');
      showToast(error || 'Set ELEVEN_AGENT_ID in Vercel environment variables.', 0);
      return;
    }
    jarvisConfig = await res.json();
  } catch (err) {
    console.error('[JARVIS] Failed to fetch config:', err);
    setStatus('AGENT ID NOT SET', 'error');
    showToast('Set ELEVEN_AGENT_ID in Vercel environment variables.', 0);
    return;
  }

  if (!jarvisConfig.conversationToken && !jarvisConfig.agentId) {
    setStatus('AGENT ID NOT SET', 'error');
    showToast('Set ELEVEN_AGENT_ID in Vercel environment variables.', 0);
    return;
  }

  // Guard: Web Speech API not available (Firefox, Safari, some mobile browsers)
  const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!SR) {
    setStatus('BROWSER UNSUPPORTED', 'error');
    showToast('Wake-word detection requires Chrome or Edge.', 0);
    return;
  }

  recognition = createRecognition();
  await armWakeWord();
  setStatus('SYSTEMS ONLINE', 'online');
  micBtn.classList.remove('hidden');
  updateMicButton();
}

init();

// Start the ambient canvas visualizer immediately — shows idle animation
// before keys load, then transitions to live frequency data during sessions.
startCanvasLoop();
