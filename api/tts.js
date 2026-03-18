import { applyHeaders, isRateLimited, getIp } from './_lib.js';

/**
 * POST /api/tts
 * Body: { text: string, voice?: string }
 * Returns: audio/mpeg stream (OpenAI TTS)
 *
 * Falls back with 503 if OPENAI_API_KEY is not set, so the
 * frontend can gracefully degrade to the Web Speech API.
 */
export default async function handler(req, res) {
  applyHeaders(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'TTS not configured' });

  const ip = getIp(req);
  if (isRateLimited(`${ip}:tts`, 60, 60_000)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { text, voice = 'nova' } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  const input = text.slice(0, 4096); // OpenAI max

  const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'tts-1', input, voice }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return res.status(upstream.status).json({ error: err });
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  // Stream directly to client
  const reader = upstream.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}
