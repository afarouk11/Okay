import { createClient } from '@supabase/supabase-js';

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!supabase) {
    if (req.method === 'GET')
      return res.status(200).json({ progress: [], mistakes: [], activity: [], profile: null });
    if (req.method === 'POST') return res.status(200).json({ success: true });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!['GET', 'POST'].includes(req.method))
    return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const [{ data: progress }, { data: mistakes }, { data: activity }] = await Promise.all([
      supabase.from('progress').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('mistakes').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }),
      supabase.from('activity_log').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    ]);
    return res.status(200).json({
      progress: progress ?? [],
      mistakes: mistakes ?? [],
      activity: activity ?? [],
    });
  }

  // POST
  const { subject, topic, correct, total, xpEarned = 0 } = req.body || {};
  if (typeof total === 'number' && total < 0)
    return res.status(400).json({ error: 'total must be non-negative' });
  if (typeof correct === 'number' && typeof total === 'number' && correct > total)
    return res.status(400).json({ error: 'correct cannot exceed total' });
  if (xpEarned < 0)
    return res.status(400).json({ error: 'xpEarned must be non-negative' });

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const today = new Date().toISOString().split('T')[0];

  await supabase.from('progress').upsert({
    user_id: user.id, subject, topic, accuracy,
    questions_answered: total, xp: xpEarned,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,subject,topic' });

  await supabase.rpc('increment_user_stats', { uid: user.id, xp_inc: xpEarned, q_inc: total || 0 }).catch(() => {});

  const { data: existing } = await supabase.from('activity_log').select('*').eq('user_id', user.id).eq('date', today).single();
  if (existing) {
    await supabase.from('activity_log').update({
      questions_done: (existing.questions_done || 0) + (total || 0),
      xp_earned: (existing.xp_earned || 0) + xpEarned,
    }).eq('id', existing.id);
  } else {
    try {
      await supabase.from('activity_log').insert({
        user_id: user.id, date: today,
        questions_done: total || 0, xp_earned: xpEarned,
      });
    } catch {}
  }

  return res.status(200).json({ success: true, accuracy });
}
