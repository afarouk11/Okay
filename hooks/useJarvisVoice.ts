'use client';

import { useRef, useCallback, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type VoiceConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface JarvisVoiceState {
  status: VoiceConnectionStatus;
  /** Most recent user transcript from ElevenLabs data channel */
  transcript: string;
  /** True while the ElevenLabs agent is producing audio */
  agentSpeaking: boolean;
  /** Milliseconds elapsed in the current session — 0 when idle */
  sessionElapsedMs: number;
}

export interface JarvisVoiceControls {
  startSession: () => Promise<void>;
  disconnect: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ICE_GATHERING_TIMEOUT_MS = 4_000;
const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useJarvisVoice
 *
 * Manages a WebRTC session with ElevenLabs Conversational AI.
 * Follows the Jarvis Protocol:
 *  - All mutable connection objects are held in useRef (no re-render churn)
 *  - stopListening() is always called before startSession() (feedback-loop guard)
 *  - _sessionSavedMs tracks session start; delta is computed on disconnect
 *
 * @param authToken  - Supabase bearer token for our API routes
 * @param onElapsed  - Optional callback fired on disconnect with session duration (ms)
 */
export function useJarvisVoice(
  authToken: string | null,
  onElapsed?: (ms: number) => void,
): JarvisVoiceState & JarvisVoiceControls {

  // ── Refs — never trigger re-renders ───────────────────────────────────────
  const pc              = useRef<RTCPeerConnection | null>(null);
  const micStream       = useRef<MediaStream | null>(null);
  const audioEl         = useRef<HTMLAudioElement | null>(null);
  const dataChannel     = useRef<RTCDataChannel | null>(null);
  const _sessionSavedMs = useRef<number>(0);   // Jarvis Protocol: useRef for timing

  // ── Reactive state ────────────────────────────────────────────────────────
  const [status, setStatus]               = useState<VoiceConnectionStatus>('idle');
  const [transcript, setTranscript]       = useState('');
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [sessionElapsedMs, setSessionElapsedMs] = useState(0);

  // ── stopListening ─────────────────────────────────────────────────────────
  // Guardrail: always call this before startSession to prevent the AI from
  // detecting its own audio output as a wake-word (feedback loop).
  const stopListening = useCallback(() => {
    if (micStream.current) {
      micStream.current.getTracks().forEach(track => track.stop());
      micStream.current = null;
    }
  }, []);

  // ── disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    stopListening();

    dataChannel.current?.close();
    dataChannel.current = null;

    pc.current?.close();
    pc.current = null;

    if (audioEl.current) {
      audioEl.current.pause();
      audioEl.current.srcObject = null;
    }

    // Compute and surface session delta
    if (_sessionSavedMs.current > 0) {
      const elapsed = Date.now() - _sessionSavedMs.current;
      _sessionSavedMs.current = 0;
      setSessionElapsedMs(elapsed);
      onElapsed?.(elapsed);
    }

    setStatus('disconnected');
    setAgentSpeaking(false);
    setTranscript('');
  }, [onElapsed, stopListening]);

  // ── startSession ──────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    if (!authToken) return;

    // Protocol: deactivate input before opening a new session
    stopListening();
    setStatus('connecting');

    try {
      // ── 1. Fetch signed ElevenLabs conversation token ──────────────────
      const tokenRes = await fetch('/api/tts', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!tokenRes.ok) throw new Error('Failed to fetch conversation token.');

      const { conversationToken, agentId } = await tokenRes.json() as {
        conversationToken?: string;
        agentId?: string;
      };

      // ── 2. Create RTCPeerConnection ────────────────────────────────────
      const conn = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      pc.current = conn;

      // ── 3. Route remote audio to an Audio element ──────────────────────
      // This is what the user actually hears. Must be set up before createOffer.
      conn.ontrack = (event) => {
        if (!audioEl.current) audioEl.current = new Audio();
        audioEl.current.srcObject = event.streams[0] ?? null;
        audioEl.current.play().catch(() => undefined);
      };

      // ── 4. Data channel for ElevenLabs events ─────────────────────────
      // Must be created by the offerer (us) before createOffer().
      const dc = conn.createDataChannel('events', { ordered: true });
      dataChannel.current = dc;

      dc.onmessage = (e) => {
        try {
          const msg = JSON.parse(String(e.data)) as Record<string, unknown>;
          const type = msg.type as string | undefined;

          if (type === 'transcript') {
            const te = msg.transcript_event as { text?: string } | undefined;
            if (te?.text) setTranscript(te.text);
          }
          if (type === 'agent_response_started')  setAgentSpeaking(true);
          if (type === 'agent_response_finished') setAgentSpeaking(false);
        } catch { /* non-JSON control frames are silently discarded */ }
      };

      // ── 5. Capture microphone ──────────────────────────────────────────
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStream.current = mic;
      mic.getTracks().forEach(track => conn.addTrack(track, mic));

      // ── 6. Create offer ────────────────────────────────────────────────
      const offer = await conn.createOffer();
      await conn.setLocalDescription(offer);

      // ── 7. Wait for ICE gathering to complete ──────────────────────────
      // Collecting all candidates before signaling avoids a second round-trip
      // and keeps end-to-end latency below our 500ms target.
      await new Promise<void>((resolve) => {
        if (conn.iceGatheringState === 'complete') { resolve(); return; }
        const timeout = setTimeout(resolve, ICE_GATHERING_TIMEOUT_MS);
        conn.onicegatheringstatechange = () => {
          if (conn.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            resolve();
          }
        };
      });

      // ── 8. Signal offer to ElevenLabs via our proxy route ─────────────
      const sigRes = await fetch('/api/voice-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sdp: conn.localDescription?.sdp,
          conversationToken,
          agentId,
        }),
      });

      if (!sigRes.ok) {
        const err = await sigRes.json().catch(() => null) as { error?: string } | null;
        throw new Error(err?.error ?? 'WebRTC signaling failed.');
      }

      const { sdp: answerSdp } = await sigRes.json() as { sdp: string };

      // ── 9. Complete the handshake ──────────────────────────────────────
      await conn.setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp: answerSdp }),
      );

      // Session clock starts here
      _sessionSavedMs.current = Date.now();
      setSessionElapsedMs(0);
      setStatus('connected');

    } catch (error) {
      console.error('Voice session failed, Sir:', error);
      disconnect();
      setStatus('error');
    }
  }, [authToken, disconnect, stopListening]);

  return {
    status,
    transcript,
    agentSpeaking,
    sessionElapsedMs,
    startSession,
    disconnect,
  };
}
