import { createClient } from '@supabase/supabase-js';
import { applyHeaders, isRateLimited, getIp } from './_lib.js';

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

const EXPORT_TABLES = [
  'profiles',
  'progress',
  'notes',
  'chat_history',
  'flashcards',
  'mistakes',
  'exams',
  'activity_log',
];

const EXPORT_RATE_LIMIT_MAX    = 5;
const EXPORT_RATE_LIMIT_WINDOW = 60 * 60_000;

export default async function handler(req, res) {
  applyHeaders(res, 'POST, GET, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET ?action=export — GDPR data export ──────────────────────────────────
  if (req.method === 'GET' && req.query?.action === 'export') {
    if (!supabase) {
      return res.status(200).json({ exported_at: new Date().toISOString(), data: {}, note: 'Demo mode — no server data stored' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

    if (isRateLimited(`${user.id}:export`, EXPORT_RATE_LIMIT_MAX, EXPORT_RATE_LIMIT_WINDOW)) {
      return res.status(429).json({ error: 'Too many export requests — please wait before trying again' });
    }

    try {
      const result = {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        email: user.email,
        data: {},
      };

      const fetches = EXPORT_TABLES.map(async (table) => {
        const col = table === 'profiles' ? 'id' : 'user_id';
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq(col, user.id);

        if (!error) result.data[table] = data || [];
      });

      await Promise.all(fetches);

      res.setHeader('Content-Disposition', `attachment; filename="synaptiq-data-export-${Date.now()}.json"`);
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(result);
    } catch (e) {
      const msg = /fetch|network|ECONNREFUSED|ETIMEDOUT|socket/i.test(e.message)
        ? 'Unable to reach the database. Please try again shortly.'
        : e.message;
      return res.status(500).json({ error: msg });
    }
  }

  const ip = getIp(req);
  if (isRateLimited(`${ip}:notes`, 60, 60_000)) {
    return res.status(429).json({ error: 'Too many requests — please try again later' });
  }

  if (!supabase) {
    // Demo mode: notes stored client-side only
    if (req.method === 'GET') return res.status(200).json({ notes: [] });
    return res.status(200).json({ success: true, note: req.body || {} });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data } = await supabase.from('notes').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    const notes = (data || []).map(n => ({ ...n, text: n.content, tag: n.tags?.[0] }));
    return res.status(200).json({ notes });
  }

  if (req.method === 'POST') {
    const { text, content, subject, tag } = req.body;
    const noteContent = content || text;
    if (!noteContent) return res.status(400).json({ error: 'text is required' });
    if (!subject) return res.status(400).json({ error: 'subject is required' });
    const { data } = await supabase.from('notes').insert({
      user_id: user.id,
      title: noteContent.slice(0, 60),
      content: noteContent,
      subject,
      tags: tag ? [tag] : [],
      created_at: new Date().toISOString()
    }).select().single();
    // Return in legacy shape so client code works unchanged
    return res.status(200).json({ note: data ? { ...data, text: data.content, tag: data.tags?.[0] } : null });
  }

  if (req.method === 'PUT') {
    const { id, text, subject, tag } = req.body;
    const updates = {};
    if (text !== undefined) { updates.content = text; updates.title = text.slice(0, 60); }
    if (subject !== undefined) updates.subject = subject;
    if (tag !== undefined) updates.tags = [tag];
    const { data, error: updateErr } = await supabase.from('notes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (updateErr) return res.status(400).json({ error: updateErr.message });
    if (!data) return res.status(404).json({ error: 'Note not found' });
    return res.status(200).json({ note: { ...data, text: data.content, tag: data.tags?.[0] } });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !UUID_RE.test(id)) return res.status(400).json({ error: 'A valid id is required' });
    await supabase.from('notes').delete().eq('id', id).eq('user_id', user.id);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
