import { createClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const isExport = req.query?.action === 'export';

  if (!supabase) {
    if (isExport) {
      return res.status(200).json({
        note: 'Running in demo mode — no data available',
        data: {},
        exported_at: new Date().toISOString(),
      });
    }
    if (req.method === 'GET') return res.status(200).json({ notes: [] });
    if (req.method === 'POST') return res.status(200).json({ success: true });
    return res.status(200).json({ success: true });
  }

  // Auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  // GDPR export
  if (isExport && req.method === 'GET') {
    try {
      const tables = ['profiles', 'progress', 'notes', 'flashcards', 'mistakes'];
      const results = await Promise.all(
        tables.map(t => supabase.from(t).select('*').eq('user_id', user.id).order('created_at', { ascending: false }))
      );
      const data = {};
      tables.forEach((t, i) => { data[t] = results[i].data ?? []; });
      return res.status(200).json({ user_id: user.id, email: user.email, exported_at: new Date().toISOString(), data });
    } catch (err) {
      if (err.message?.includes('fetch failed') || err.message?.includes('ECONNREFUSED'))
        return res.status(500).json({ error: 'Unable to reach the database. Please check your connection.' });
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'GET') {
    const { data } = await supabase.from('notes').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    const notes = (data ?? []).map(n => ({ ...n, text: n.content, tag: n.tags?.[0] }));
    return res.status(200).json({ notes });
  }

  if (req.method === 'POST') {
    const { text, content, subject, tag } = req.body || {};
    const noteContent = content || text;
    if (!noteContent) return res.status(400).json({ error: 'text is required' });
    if (!subject) return res.status(400).json({ error: 'subject is required' });
    const { data } = await supabase.from('notes').insert({
      user_id: user.id, title: noteContent.slice(0, 60), content: noteContent,
      subject, tags: tag ? [tag] : [], created_at: new Date().toISOString(),
    }).select().single();
    return res.status(200).json({ note: data ? { ...data, text: data.content, tag: data.tags?.[0] } : null });
  }

  if (req.method === 'PUT') {
    const { id, text, subject, tag } = req.body || {};
    const updates = {};
    if (text !== undefined) { updates.content = text; updates.title = String(text).slice(0, 60); }
    if (subject !== undefined) updates.subject = subject;
    if (tag !== undefined) updates.tags = [tag];
    const { data, error } = await supabase.from('notes').update(updates).eq('id', id).eq('user_id', user.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Note not found' });
    return res.status(200).json({ note: { ...data, text: data.content, tag: data.tags?.[0] } });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id || !UUID_RE.test(id)) return res.status(400).json({ error: 'A valid id is required' });
    await supabase.from('notes').delete().eq('id', id).eq('user_id', user.id);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
