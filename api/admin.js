import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

function checkAdminKey(req) {
  const provided = req.headers['x-admin-key'];
  const expected = process.env.ADMIN_SECRET_KEY;
  if (!provided || !expected) return false;
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch { return false; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!checkAdminKey(req)) return res.status(403).json({ error: 'Forbidden' });

  const { action, page = 1, per_page = 50 } = req.body || {};
  const db = supabase;

  if (action === 'stats') {
    const [
      { count: total },
      { count: active_7d },
      { count: paying },
    ] = await Promise.all([
      db.from('profiles').select('id', { count: 'exact', head: true }),
      db.from('profiles').select('id', { count: 'exact', head: true })
        .gte('last_active', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]),
      db.from('profiles').select('id', { count: 'exact', head: true })
        .in('subscription_status', ['active', 'trialing']),
    ]);
    return res.status(200).json({
      total_users: total ?? 0,
      active_7d: active_7d ?? 0,
      paying: paying ?? 0,
      mrr: (paying ?? 0) * 40,
    });
  }

  if (action === 'users') {
    const offset = (Number(page) - 1) * Number(per_page);
    const { data, count } = await db.from('profiles').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(per_page) - 1);
    const total = count ?? 0;
    return res.status(200).json({
      users: data ?? [],
      total,
      pages: Math.max(1, Math.ceil(total / Number(per_page))),
    });
  }

  if (action === 'send_weekly_emails') {
    const siteUrl = process.env.SITE_URL || 'https://synaptiq.co.uk';
    const { data: users } = await db.from('profiles').select('*').in('subscription_status', ['active', 'trialing']);
    const list = users ?? [];
    let sent = 0, failed = 0;
    await Promise.all(list.map(async u => {
      try {
        const r = await fetch(`${siteUrl}/api/resend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY || '' },
          body: JSON.stringify({
            to: u.email, type: 'weekly', name: u.name || u.email,
            stats: { questions: u.questions_answered || 0, accuracy: u.accuracy || 0, xp: u.xp || 0, streak: u.streak || 0 },
          }),
        });
        if (r.ok) sent++; else failed++;
      } catch { failed++; }
    }));
    return res.status(200).json({ sent, failed });
  }

  if (action === 'reset_users') {
    const { data: { users }, error } = await db.auth.admin.listUsers();
    if (error) return res.status(500).json({ error: error.message });
    let deleted = 0;
    await Promise.all((users || []).map(async u => {
      await db.auth.admin.deleteUser(u.id);
      deleted++;
    }));
    try { await db.from('profiles').delete().in('id', (users || []).map(u => u.id)); } catch {}
    return res.status(200).json({ ok: true, deleted });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
