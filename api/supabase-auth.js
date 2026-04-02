/**
 * api/supabase-auth.js — Supabase auth & profile proxy.
 *
 * Uses direct fetch() calls to Supabase REST / Auth APIs so that
 * env vars are resolved at request time (not at module load), keeping
 * demo-mode and test scenarios working without a real Supabase project.
 */

import { applyHeaders, isRateLimited, getIp } from './_lib.js';

function headers(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

export default async function handler(req, res) {
  applyHeaders(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIp(req);
  if (isRateLimited(`${ip}:supabase-auth`, 20, 60_000)) {
    return res.status(429).json({ error: 'Too many requests — please try again later' });
  }

  const url = process.env.SUPABASE_URL;
  const svcKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !svcKey) {
    return res.status(500).json({ error: 'Supabase configuration is missing' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (_) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { action, payload } = body;

  try {
    // ── create_auth_user ──────────────────────────────────────────────────────
    if (action === 'create_auth_user') {
      const { email, password } = payload || {};
      if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

      const r = await fetch(`${url}/auth/v1/admin/users`, {
        method: 'POST',
        headers: headers(svcKey),
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      return res.status(200).json({ id: data.id, email: data.email });
    }

    // ── verify_login ──────────────────────────────────────────────────────────
    if (action === 'verify_login') {
      const { email, password } = payload || {};
      if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

      const anonKey = process.env.SUPABASE_ANON_KEY;
      if (!anonKey) return res.status(500).json({ error: 'Supabase anon key is missing' });

      const loginR = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: headers(anonKey),
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginR.json();
      if (!loginR.ok) return res.status(401).json({ error: loginData.error_description || 'Invalid credentials' });

      const uid = loginData.user?.id;

      const profileR = await fetch(
        `${url}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=*`,
        { headers: headers(svcKey) },
      );
      const profiles = await profileR.json();
      if (Array.isArray(profiles) && profiles.length > 0) {
        return res.status(200).json(profiles[0]);
      }

      const createR = await fetch(`${url}/rest/v1/profiles`, {
        method: 'POST',
        headers: { ...headers(svcKey), Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ id: uid, email, name: email.split('@')[0], plan: 'free' }),
      });
      const created = await createR.json();
      return res.status(200).json(Array.isArray(created) ? created[0] : created);
    }

    // ── forgot_password ───────────────────────────────────────────────────────
    if (action === 'forgot_password') {
      const { email } = payload || {};
      if (!email) return res.status(400).json({ error: 'email is required' });

      const anonKey = process.env.SUPABASE_ANON_KEY;
      if (!anonKey) return res.status(500).json({ error: 'Supabase anon key is missing' });

      await fetch(`${url}/auth/v1/recover`, {
        method: 'POST',
        headers: headers(anonKey),
        body: JSON.stringify({ email }),
      });
      // Always 200 — prevents email enumeration
      return res.status(200).json({ ok: true });
    }

    // ── upsert_profile ────────────────────────────────────────────────────────
    if (action === 'upsert_profile') {
      const r = await fetch(`${url}/rest/v1/profiles`, {
        method: 'POST',
        headers: { ...headers(svcKey), Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(payload || {}),
      });
      const data = await r.json();
      return res.status(200).json(Array.isArray(data) ? data[0] : data);
    }

    // ── patch_profile ─────────────────────────────────────────────────────────
    if (action === 'patch_profile') {
      const { id, ...rest } = payload || {};
      if (!id) return res.status(400).json({ error: 'id is required' });

      const r = await fetch(`${url}/rest/v1/profiles?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers(svcKey), Prefer: 'return=representation' },
        body: JSON.stringify(rest),
      });
      const data = await r.json();
      return res.status(200).json(Array.isArray(data) ? data[0] : data);
    }

    // ── get_profile ───────────────────────────────────────────────────────────
    if (action === 'get_profile') {
      const { email } = payload || {};
      if (!email) return res.status(400).json({ error: 'email is required' });
      const r = await fetch(
        `${url}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=*`,
        { headers: headers(svcKey) },
      );
      const data = await r.json();
      return res.status(200).json(Array.isArray(data) ? data[0] : data);
    }

    // ── save_upload ───────────────────────────────────────────────────────────
    if (action === 'save_upload') {
      const r = await fetch(`${url}/rest/v1/resources`, {
        method: 'POST',
        headers: { ...headers(svcKey), Prefer: 'return=representation' },
        body: JSON.stringify(payload || {}),
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    // ── get_uploads ───────────────────────────────────────────────────────────
    if (action === 'get_uploads') {
      const userId = body.userId || payload?.userId;
      if (!userId) return res.status(400).json({ error: 'userId is required' });

      const r = await fetch(`${url}/rest/v1/resources?user_id=eq.${userId}`, {
        headers: headers(svcKey),
      });
      const data = await r.json();
      return res.status(200).json({ data: Array.isArray(data) ? data : [] });
    }

    // ── leaderboard ───────────────────────────────────────────────────────────
    if (action === 'leaderboard') {
      const { tab, userId: uid } = payload || {};
      const orderCol = tab === 'streak' ? 'streak' : 'xp';

      const topR = await fetch(
        `${url}/rest/v1/profiles?select=name,xp,streak,avatar_emoji&order=${orderCol}.desc&limit=20`,
        { headers: headers(svcKey) },
      );
      const topData = await topR.json();
      const top = Array.isArray(topData) ? topData : [];

      if (!uid) return res.status(200).json({ top, userRank: null });

      const lastScore = top.length > 0 ? (top[top.length - 1][orderCol] ?? 0) : 0;

      const countR = await fetch(
        `${url}/rest/v1/profiles?select=id&${orderCol}=gt.${lastScore}`,
        { headers: headers(svcKey) },
      );
      const countData = await countR.json();
      const countAboveTop = Array.isArray(countData) ? countData.length : 0;

      const meR = await fetch(
        `${url}/rest/v1/profiles?id=eq.${uid}&select=${orderCol},name`,
        { headers: headers(svcKey) },
      );
      const meData = await meR.json();
      const me = Array.isArray(meData) && meData.length > 0 ? meData[0] : null;
      const myScore = me ? (me[orderCol] ?? 0) : 0;

      const aboveR = await fetch(
        `${url}/rest/v1/profiles?select=id&${orderCol}=gt.${myScore}`,
        { headers: headers(svcKey) },
      );
      const aboveData = await aboveR.json();
      const userRank = (Array.isArray(aboveData) ? aboveData.length : 0) + 1;

      return res.status(200).json({ top, userRank, countAboveTop });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
