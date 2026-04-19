import { createClient } from '@supabase/supabase-js';

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const DEMO_SESSIONS = [
  { topic: 'Differentiation', duration_min: 25, type: 'Study', why: 'Core topic' },
  { topic: 'Integration', duration_min: 25, type: 'Revision', why: 'Needs practice' },
  { topic: 'Break', duration_min: 10, type: 'Break', why: 'Rest' },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const rawTime = body.time_available;
  const timeAvailable = rawTime !== undefined
    ? Math.min(480, Math.max(15, Number(rawTime) || 60))
    : 60;

  if (body.focus !== undefined) {
    if (typeof body.focus !== 'string') return res.status(400).json({ error: 'focus must be a string' });
    if (body.focus.length > 120) return res.status(400).json({ error: 'focus must be 120 characters or fewer' });
  }

  if (!supabase) {
    return res.status(200).json({
      plan: {
        date: new Date().toISOString().split('T')[0],
        time_available: timeAvailable,
        sessions: DEMO_SESSIONS,
      },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  // Fetch context
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const { data: weakTopics } = await supabase.from('progress').select('topic,accuracy').eq('user_id', user.id).order('accuracy', { ascending: true }).limit(5);
  const { data: reviewQueue } = await supabase.from('progress').select('topic').eq('user_id', user.id).order('updated_at', { ascending: true }).limit(5);

  const profileInfo = profile ? `Year: ${profile.year_group || 'unknown'}, Board: ${profile.exam_board || 'unknown'}, Target: ${profile.target_grade || 'unknown'}` : 'No profile';
  const weakStr = (weakTopics || []).map(t => `${t.topic} (${t.accuracy}%)`).join(', ') || 'none';
  const reviewStr = (reviewQueue || []).map(t => t.topic).join(', ') || 'none';

  const prompt = `Create a study plan for ${timeAvailable} minutes.
Profile: ${profileInfo}
Weak topics: ${weakStr}
Review queue: ${reviewStr}
${body.focus ? `Focus on: ${body.focus}` : ''}

Return ONLY valid JSON: {"sessions":[{"topic":"...","duration_min":N,"type":"Study|Revision|Break","why":"..."}]}`;

  let planData;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!r.ok) {
      const errData = await r.json().catch(() => ({}));
      return res.status(502).json({ error: `AI service returned ${r.status}: ${errData?.error?.type || 'error'}` });
    }
    const data = await r.json();
    const text = data?.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    try {
      planData = match ? JSON.parse(match[0]) : null;
    } catch { planData = null; }
  } catch (err) {
    if (err.message?.includes('ECONNREFUSED') || err.message?.includes('fetch failed'))
      return res.status(500).json({ error: 'Failed to connect to AI service' });
    return res.status(500).json({ error: err.message });
  }

  const sessions = planData?.sessions ?? [];
  const date = new Date().toISOString().split('T')[0];

  if (body.save_tasks && sessions.length) {
    const tasks = sessions.filter(s => s.type !== 'Break').map(s => ({
      user_id: user.id, title: s.topic, done: false, github_issue_number: null,
    }));
    if (tasks.length) { try { await supabase.from('tasks').insert(tasks); } catch {} }
  }

  return res.status(200).json({ plan: { date, time_available: timeAvailable, sessions } });
}
