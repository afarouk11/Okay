import { applyHeaders, isRateLimited, getIp, fetchWithRetry } from './_lib.js';

/**
 * POST /api/transcribe — Speech-to-text via Deepgram.
 *
 * Accepts a raw audio binary body (Content-Type: audio/webm, audio/mp4, etc.)
 * and returns the transcript as JSON.
 *
 * Body:   raw audio bytes
 * Returns { transcript: string }
 *
 * Errors:
 *   400 — missing / empty audio body
 *   429 — rate limited
 *   503 — DEEPGRAM_API_KEY not set or Deepgram unreachable
 *   422 — audio received but no speech detected
 */

export const config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function normaliseAudioContentType(value) {
  const raw = String(value || '').toLowerCase().trim();
  const base = raw.split(';')[0].trim();

  if (!base) return 'audio/webm';
  if (base.includes('webm')) return 'audio/webm';
  if (base.includes('mp4') || base.includes('m4a') || base.includes('aac')) return 'audio/mp4';
  if (base.includes('mpeg') || base.includes('mp3')) return 'audio/mpeg';
  if (base.includes('ogg') || base.includes('opus')) return 'audio/ogg';
  return 'audio/webm';
}

function formatUpstreamError(err) {
  const text = String(err || '').trim();
  if (/did not match the expected pattern|unsupported|invalid/i.test(text)) {
    return 'Unsupported audio format from the browser — please try Chrome or Edge and speak again.';
  }
  return text || 'Transcription failed — please try again.';
}

export default async function handler(req, res) {
  applyHeaders(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Transcription not configured' });

  const ip = getIp(req);
  if (isRateLimited(`${ip}:transcribe`, 30, 60_000)) {
    return res.status(429).json({ error: 'Too many requests — please try again later' });
  }

  let body;
  try {
    body = await getRawBody(req);
  } catch (_) {
    return res.status(400).json({ error: 'Failed to read audio data' });
  }

  if (!body || body.length === 0) {
    return res.status(400).json({ error: 'Audio data is required' });
  }

  const contentType = normaliseAudioContentType(req.headers['content-type']);

  let upstream;
  try {
    upstream = await fetchWithRetry(
      'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': contentType,
        },
        body,
      }
    );
  } catch (_) {
    return res.status(503).json({ error: 'Transcription service unavailable — please try again' });
  }

  if (!upstream.ok) {
    const err = formatUpstreamError(await upstream.text());
    return res.status(upstream.status).json({ error: err });
  }

  const data = await upstream.json();
  const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';

  if (!transcript) {
    return res.status(422).json({ error: 'Could not transcribe audio — please speak clearly and try again' });
  }

  return res.status(200).json({ transcript });
}
