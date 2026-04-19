import { createClient } from '@supabase/supabase-js';

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const MAX_LIMIT = 20;
const DEFAULT_LIMIT = 5;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!supabase) {
    if (req.method === 'GET') return res.status(200).json({ sessions: [] });
    if (req.method === 'POST') return res.status(200).json({ success: true });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const rawLimit = parseInt(req.query?.limit, 10);
    const limit = isNaN(rawLimit)
      ? DEFAULT_LIMIT
      : Math.min(MAX_LIMIT, Math.max(1, rawLimit));
    const { data, error } = await supabase
      .from('memory_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ sessions: data ?? [] });
  }

  // POST
  const body = req.body || {};
  const { topic, mastery_score, specific_errors, duration_ms } = body;

  if (topic !== undefined && topic !== null && typeof topic !== 'string')
    return res.status(400).json({ error: 'topic must be a string' });
  if (typeof topic === 'string' && topic.length > 100)
    return res.status(400).json({ error: 'topic must be 100 characters or fewer' });
  if (mastery_score !== undefined && mastery_score !== null) {
    if (typeof mastery_score !== 'number' || mastery_score < 0 || mastery_score > 1)
      return res.status(400).json({ error: 'mastery_score must be between 0 and 1' });
  }
  if (specific_errors !== undefined && specific_errors !== null) {
    if (!Array.isArray(specific_errors))
      return res.status(400).json({ error: 'specific_errors must be an array' });
    if (specific_errors.length > 20)
      return res.status(400).json({ error: 'specific_errors must have 20 or fewer entries' });
    for (const e of specific_errors) {
      if (typeof e !== 'string') return res.status(400).json({ error: 'each error must be a string' });
      if (e.length > 200) return res.status(400).json({ error: 'error strings must be 200 characters or fewer' });
    }
  }
  if (duration_ms !== undefined && duration_ms !== null) {
    if (typeof duration_ms !== 'number' || !Number.isInteger(duration_ms) || duration_ms < 0)
      return res.status(400).json({ error: 'duration_ms must be a non-negative integer' });
  }

  const trimmedTopic = typeof topic === 'string' ? topic.trim() || null : (topic ?? null);
  const { error } = await supabase.from('memory_sessions').insert({
    user_id: user.id,
    topic: trimmedTopic,
    mastery_score: mastery_score ?? null,
    specific_errors: specific_errors ?? [],
    duration_ms: duration_ms ?? null,
    session_date: new Date().toISOString(),
  });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ success: true });
}
