import { applyHeaders, isRateLimited, getIp } from './_lib.js';

/**
 * POST /api/tts
 * Body: { text: string, voice?: string }
 * Returns: audio/mpeg stream (ElevenLabs TTS)
 *
 * Jarvis voice: George (deep authoritative British male)
 * Settings tuned for natural AI-assistant delivery — not robotic, not script-reader.
 * stability ~0.48 = natural prosody/inflection (Jarvis has subtle warmth)
 * similarity_boost 0.82 = strong voice character without sounding processed
 * style 0.18 = slight expressiveness so it doesn't sound flat
 */

const VOICE_IDS = {
  alice:     'Xb7hH8MSUJpSbSDYk0k2',
  charlotte: 'XB0fDUnXU5powFXDhCwa',
  dorothy:   'ThT5KcBeYPX3keUQqHPh',
  daniel:    'onwK4e9ZLuTAKqWW03F9',
  jarvis:    'JBFqnCBsd6RMkjVDRZzb', // George — deep, authoritative British male
};

const VOICE_SETTINGS = {
  jarvis:  { stability: 0.48, similarity_boost: 0.82, style: 0.18, use_speaker_boost: true },
  alice:   { stability: 0.55, similarity_boost: 0.80, style: 0.12, use_speaker_boost: true },
  default: { stability: 0.5,  similarity_boost: 0.75 },
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
  const input = text.slice(0, 5000);
  const voiceSettings = VOICE_SETTINGS[voice] || VOICE_SETTINGS.default;

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
        voice_settings: voiceSettings,
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
