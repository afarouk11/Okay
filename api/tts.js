import { applyHeaders, isRateLimited, getIp } from './_lib.js';

/**
 * POST /api/tts
 * Body: { text: string, voice?: string }
 * Returns: audio/mpeg stream (ElevenLabs TTS)
 *
 * Falls back with 503 if ELEVENLABS_API_KEY is not set, so the
 * frontend can gracefully degrade to the Web Speech API.
 *
 * Default voice: Alice (Xb7hH8MSUJpSbSDYk0k2) — confident British female.
 * Override by passing a voice name: 'alice' | 'charlotte' | 'dorothy' | 'daniel'
 */

const VOICE_IDS = {
  alice:     'Xb7hH8MSUJpSbSDYk0k2', // confident British female (default)
  charlotte: 'XB0fDUnXU5powFXDhCwa', // young British female
  dorothy:   'ThT5KcBeYPX3keUQqHPh', // warm British female
  daniel:    'onwK4e9ZLuTAKqWW03F9', // calm British male
};

export default async function handler(req, res) {
  applyHeaders(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'TTS not configured' });

  const ip = getIp(req);
  if (isRateLimited(`${ip}:tts`, 60, 60_000)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { text, voice = 'alice' } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  const voiceId = VOICE_IDS[voice] || VOICE_IDS.alice;
  const input = text.slice(0, 5000); // ElevenLabs free tier limit

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: input,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!upstream.ok) {
    const err = await upstream.text();
    return res.status(upstream.status).json({ error: err });
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  const reader = upstream.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}
