import { applyHeaders, isRateLimited, getIp } from './_lib.js';

/**
 * GET /api/jarvis-config
 * Returns a short-lived ElevenLabs signed URL for the JARVIS Conversational AI agent.
 *
 * Using a signed URL keeps ELEVEN_AGENT_ID server-side and avoids build-time
 * injection — the token is fetched fresh each time the user opens a session.
 */

const RATE_LIMIT_MAX    = 10;      // max requests
const RATE_LIMIT_WINDOW = 60_000;  // per 60 seconds
export default async function handler(req, res) {
  applyHeaders(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIp(req);
  if (isRateLimited(`${ip}:jarvis-config`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW)) {
    return res.status(429).json({ error: 'Too many requests — please try again later' });
  }

  const agentId = process.env.ELEVEN_AGENT_ID;
  if (!agentId) {
    return res.status(503).json({ error: 'ELEVEN_AGENT_ID not configured. Add it to your Vercel environment variables.' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // No API key — fall back to exposing the agent ID directly so the client
    // can still connect (public agents do not require a signed URL).
    return res.status(200).json({ agentId });
  }

  try {
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { 'xi-api-key': apiKey } }
    );

    if (!elevenRes.ok) {
      const text = await elevenRes.text();
      console.error('ElevenLabs signed URL error:', elevenRes.status, text);
      // Fall back to plain agent ID so JARVIS still works for public agents.
      return res.status(200).json({ agentId });
    }

    const { signed_url: signedUrl } = await elevenRes.json();
    return res.status(200).json({ signedUrl });
  } catch (err) {
    console.error('jarvis-config fetch error:', err);
    return res.status(200).json({ agentId });
  }
}
