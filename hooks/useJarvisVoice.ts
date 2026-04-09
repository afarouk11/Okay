'use client';

import { useRef, useCallback, useState } from 'react';
import { Conversation } from '@elevenlabs/client';
import type { VoiceConversation } from '@elevenlabs/client';
import type { Status, Mode } from '@elevenlabs/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type { Status, Mode };

export interface JarvisVoiceState {
  /** SDK connection status */
  status: Status;
  /** 'speaking' when ElevenLabs agent is producing audio, 'listening' otherwise */
  mode: Mode;
  /** Most recent transcript message (user or agent) */
  lastMessage: { role: 'user' | 'agent'; text: string } | null;
  /** Milliseconds elapsed in the current session — 0 when not connected */
  sessionElapsedMs: number;
}

export interface JarvisVoiceControls {
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  setMicMuted: (muted: boolean) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useJarvisVoice
 *
 * Wraps @elevenlabs/client for a WebRTC voice session with Jarvis.
 * Follows the Jarvis Protocol:
 *  - All mutable session objects held in useRef (no re-render churn)
 *  - endSession() is always called before startSession() (feedback-loop guard)
 *  - _sessionSavedMs tracks session start; delta is computed on disconnect
 *
 * @param authToken    - Supabase bearer token for our /api/tts token endpoint
 * @param systemPrompt - Optional system prompt override (BASE_SYSTEM + teachMode suffix)
 * @param onElapsed    - Callback fired on disconnect with session duration in ms
 */
export function useJarvisVoice(
  authToken: string | null,
  systemPrompt?: string,
  onElapsed?: (ms: number) => void,
): JarvisVoiceState & JarvisVoiceControls {

  // ── Refs — no re-renders ──────────────────────────────────────────────────
  const session         = useRef<VoiceConversation | null>(null);
  const _sessionSavedMs = useRef<number>(0);  // Jarvis Protocol: useRef for timing

  // ── Reactive state ────────────────────────────────────────────────────────
  const [status, setStatus]               = useState<Status>('disconnected');
  const [mode, setMode]                   = useState<Mode>('listening');
  const [lastMessage, setLastMessage]     = useState<{ role: 'user' | 'agent'; text: string } | null>(null);
  const [sessionElapsedMs, setSessionElapsedMs] = useState(0);

  // ── endSession ────────────────────────────────────────────────────────────
  // Guardrail: always call this before startSession() to ensure the mic and
  // audio output are fully torn down before a new session initialises.
  const endSession = useCallback(async () => {
    if (session.current) {
      await session.current.endSession().catch(() => undefined);
      session.current = null;
    }

    if (_sessionSavedMs.current > 0) {
      const elapsed = Date.now() - _sessionSavedMs.current;
      _sessionSavedMs.current = 0;
      setSessionElapsedMs(elapsed);
      onElapsed?.(elapsed);
    }
  }, [onElapsed]);

  // ── setMicMuted ───────────────────────────────────────────────────────────
  const setMicMuted = useCallback((muted: boolean) => {
    session.current?.setMicMuted(muted);
  }, []);

  // ── startSession ──────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    if (!authToken) return;

    // Protocol: tear down any existing session before opening a new one
    await endSession();
    setStatus('connecting');

    try {
      // Fetch signed ElevenLabs conversation token from our API
      const res = await fetch('/api/tts', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) throw new Error('Failed to fetch conversation token, Sir.');

      const { conversationToken, agentId } = await res.json() as {
        conversationToken?: string;
        agentId?: string;
      };

      if (!conversationToken && !agentId) {
        throw new Error('No ElevenLabs credentials available.');
      }

      // Build session config — prefer signed token (WebRTC) over agentId (WebSocket)
      const sessionConfig = conversationToken
        ? {
            conversationToken,
            connectionType: 'webrtc' as const,
            ...(systemPrompt && {
              overrides: { agent: { prompt: { prompt: systemPrompt } } },
            }),
          }
        : {
            agentId: agentId!,
            connectionType: 'webrtc' as const,
            ...(systemPrompt && {
              overrides: { agent: { prompt: { prompt: systemPrompt } } },
            }),
          };

      const conv = await Conversation.startSession({
        ...sessionConfig,

        onConnect: () => {
          _sessionSavedMs.current = Date.now();
          setSessionElapsedMs(0);
          setStatus('connected');
        },

        onDisconnect: () => {
          session.current = null;
          setStatus('disconnected');
          setMode('listening');

          if (_sessionSavedMs.current > 0) {
            const elapsed = Date.now() - _sessionSavedMs.current;
            _sessionSavedMs.current = 0;
            setSessionElapsedMs(elapsed);
            onElapsed?.(elapsed);
          }
        },

        onModeChange: ({ mode: nextMode }) => {
          setMode(nextMode);
        },

        onStatusChange: ({ status: nextStatus }) => {
          setStatus(nextStatus);
        },

        onMessage: ({ role, message }) => {
          setLastMessage({ role, text: message });
        },

        onError: (message) => {
          console.error('Jarvis voice error, Sir:', message);
          setStatus('disconnected');
        },
      }) as VoiceConversation;

      session.current = conv;

    } catch (error) {
      console.error('Voice session failed, Sir:', error);
      session.current = null;
      setStatus('disconnected');
    }
  }, [authToken, endSession, onElapsed, systemPrompt]);

  return {
    status,
    mode,
    lastMessage,
    sessionElapsedMs,
    startSession,
    endSession,
    setMicMuted,
  };
}
