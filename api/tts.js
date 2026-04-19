const VOICES = {
  alice:    'Xb7hH8MSUJpSbSDYk0k2',
  charlotte:'XB0fDUnXU5powFXDhCwa',
  jarvis:   'JBFqnCBsd6RMkjVDRZzb',
  daniel:   'onwK4e9ZLuTAKqWW03F9',
  dorothy:  'ThT5KcBeYPX3keUQqHPh',
};
const DEFAULT_AGENT_ID = 'agent_4101kn5cm6t2efwsasfhx8cgh1r3';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — jarvis agent config
  if (req.method === 'GET') {
    const agentId = process.env.ELEVEN_AGENT_ID || DEFAULT_AGENT_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return res.status(200).json({ agentId });
    try {
      const r = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
        { headers: { 'xi-api-key': apiKey } }
      );
      if (!r.ok) return res.status(200).json({ agentId });
      const data = await r.json();
      return res.status(200).json({ conversationToken: data.token });
    } catch {
      return res.status(200).json({ agentId });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // POST — TTS streaming
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return res.status(503).json({ error: 'TTS service not configured' });

  const { text, voice } = req.body || {};
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text is required' });

  const voiceId = VOICES[voice] || VOICES.alice;
  let upstream;
  try {
    upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model_id: 'eleven_monolingual_v1' }),
      }
    );
  } catch {
    return res.status(503).json({ error: 'TTS service unavailable' });
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '');
    return res.status(upstream.status).json({ error: errText });
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  const reader = upstream.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}
