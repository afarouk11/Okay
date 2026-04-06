import { applyHeaders, isRateLimited, getIp } from './_lib.js';

const CLAUDE_HAIKU_MODEL = 'claude-haiku-4-5-20251001';

export default async function handler(req, res) {
  applyHeaders(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIp(req);
  if (isRateLimited(`${ip}:iq`, 10, 60_000))
    return res.status(429).json({ error: 'Too many requests — please slow down' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { exerciseType, difficulty } = req.body || {};

  const system = `You are a neuroplasticity and cognitive training expert. Create brain-training exercises that build working memory, pattern recognition and cognitive flexibility.
Respond with ONLY a valid JSON array — no markdown, no code fences, no extra text.`;

  const prompt = `Generate exactly 8 multiple-choice neuroplasticity exercises of type "${exerciseType || 'mixed'}" at "${difficulty || 'standard'}" difficulty.
Return a JSON array of 8 objects, each with:
{ "type": string, "question": string, "options": [string,string,string,string], "answer": "A"|"B"|"C"|"D", "explanation": string }
Return ONLY the JSON array.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: CLAUDE_HAIKU_MODEL,
        max_tokens: 3000,
        system,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await r.json();
    const raw = (data.content?.[0]?.text ?? '').replace(/^```(?:json)?\s*/i,'').replace(/\s*```\s*$/,'').trim();
    let questions;
    try { questions = JSON.parse(raw); } catch {
      return res.status(500).json({ error: 'AI returned malformed JSON — please try again' });
    }
    if (!Array.isArray(questions) || !questions.length)
      return res.status(500).json({ error: 'AI returned invalid format — please try again' });
    return res.status(200).json({ questions });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to connect to AI service' });
  }
}
