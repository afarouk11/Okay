import { applyHeaders, isRateLimited, getIp } from './_lib.js';

const CLAUDE_HAIKU_MODEL = 'claude-haiku-4-5-20251001';

export default async function handler(req, res) {
  applyHeaders(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIp(req);
  if (isRateLimited(`${ip}:gcse`, 20, 60_000))
    return res.status(429).json({ error: 'Too many requests — please slow down' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { topic, tier, marks } = req.body || {};
  if (!topic || !tier || !marks) return res.status(400).json({ error: 'topic, tier and marks are required' });

  const system = `You are an expert GCSE Maths examiner. Produce a real exam-style question for AQA/Edexcel.
Format your response EXACTLY as:
QUESTION:
[full question text]

SOLUTION:
[step-by-step worked solution with every mark-worthy step shown]`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: CLAUDE_HAIKU_MODEL,
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: `Generate a ${tier} tier GCSE Maths question on ${topic} worth ${marks} marks.` }]
      })
    });
    const data = await r.json();
    const raw = data.content?.[0]?.text ?? '';
    const qMatch = raw.match(/QUESTION:\s*([\s\S]*?)(?=\n\nSOLUTION:|$)/i);
    const sMatch = raw.match(/SOLUTION:\s*([\s\S]*?)$/i);
    return res.status(r.status).json({
      question: qMatch ? qMatch[1].trim() : raw.trim(),
      solution: sMatch ? sMatch[1].trim() : ''
    });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to connect to AI service' });
  }
}
