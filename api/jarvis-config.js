import { applyHeaders, isRateLimited, getIp } from './_lib.js';

/**
 * GET /api/jarvis-config
 * Returns a short-lived ElevenLabs WebRTC conversation token for the JARVIS agent.
 *
 * Using a server-issued token keeps ELEVEN_AGENT_ID and ELEVENLABS_API_KEY
 * server-side — the token is fetched fresh each time the user opens a session.
 * Falls back to the plain agent ID for public agents when no API key is set.
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

  // Fall back to the known public agent ID (already committed in .env.example)
  // so JARVIS works even before ELEVEN_AGENT_ID is configured in Vercel.
  const agentId = process.env.ELEVEN_AGENT_ID || 'agent_4101kn5cm6t2efwsasfhx8cgh1r3';

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // No API key — fall back to exposing the agent ID directly so the client
    // can still connect (public agents do not require a token).
    return res.status(200).json({ agentId });
  }

  try {
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { 'xi-api-key': apiKey } }
    );

    if (!elevenRes.ok) {
      const text = await elevenRes.text();
      console.error('ElevenLabs token error:', elevenRes.status, text);
      // Fall back to plain agent ID so JARVIS still works for public agents.
      return res.status(200).json({ agentId });
    }

    const { token: conversationToken } = await elevenRes.json();
    return res.status(200).json({ conversationToken });
  } catch (err) {
    console.error('jarvis-config fetch error:', err);
    return res.status(200).json({ agentId });
  }
}
