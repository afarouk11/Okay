// Supabase Auth & User Profile Handler
// This proxies Supabase calls server-side for operations that need service role key
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Missing Supabase config' });

  const { action, payload, upload, userId } = req.body;

  const supabaseHeaders = {
    'Content-Type': 'application/json',
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`
  };

  try {
    // ─── AUTH: Create a Supabase Auth user with email + password ───────────
    if (action === 'create_auth_user') {
      const { email, password } = payload || {};
      if (!email || !password) return res.status(400).json({ error: 'email and password required' });
      const r = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({ email, password, email_confirm: true })
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.message || data.msg || 'Could not create auth user' });
      return res.status(200).json({ id: data.id, email: data.email });
    }

    // ─── AUTH: Verify email + password, return profile ──────────────────────
    if (action === 'verify_login') {
      const { email, password } = payload || {};
      if (!email || !password) return res.status(400).json({ error: 'email and password required' });
      if (!anonKey) return res.status(500).json({ error: 'Missing SUPABASE_ANON_KEY' });

      // Step 1: verify credentials via Supabase Auth token endpoint
      const authR = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
        body: JSON.stringify({ email, password })
      });
      const authData = await authR.json();
      if (!authR.ok || authData.error) {
        return res.status(401).json({ error: authData.error_description || authData.error || 'Invalid email or password' });
      }

      // Step 2: fetch extended profile from profiles table
      const profileR = await fetch(
        `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=*`,
        { headers: supabaseHeaders }
      );
      const profiles = await profileR.json();
      let profile = Array.isArray(profiles) ? profiles[0] : null;

      // If credentials are valid but no profile row exists, create a minimal one
      if (!profile) {
        const authUserId = authData.user?.id;
        const minimalProfile = {
          email,
          name: email.split('@')[0],
          plan: 'free',
          xp: 0,
          level: 1,
          stats: {},
          flashcards: [],
          ...(authUserId ? { id: authUserId } : {})
        };
        const createR = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
          method: 'POST',
          headers: { ...supabaseHeaders, 'Prefer': 'return=representation,resolution=merge-duplicates' },
          body: JSON.stringify(minimalProfile)
        });
        const created = await createR.json();
        profile = Array.isArray(created) ? created[0] : (created || minimalProfile);
      }

      return res.status(200).json(profile);
    }

    // ─── AUTH: Send password reset email ────────────────────────────────────
    if (action === 'forgot_password') {
      const { email } = payload || {};
      if (!email) return res.status(400).json({ error: 'email required' });
      if (!anonKey) return res.status(500).json({ error: 'Missing SUPABASE_ANON_KEY' });
      const r = await fetch(`${supabaseUrl}/auth/v1/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
        body: JSON.stringify({ email })
      });
      // Supabase always returns 200 for this endpoint (prevents email enumeration)
      return res.status(200).json({ ok: true });
    }

    // ─── PROFILE: Create / update ───────────────────────────────────────────
    if (action === 'upsert_profile') {
      const r = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
        method: 'POST',
        headers: { ...supabaseHeaders, 'Prefer': 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      return res.status(r.status).json(Array.isArray(data) ? (data[0] || {}) : data);
    }

    if (action === 'patch_profile') {
      const { id, ...fields } = payload;
      if (!id) return res.status(400).json({ error: 'id required' });
      const r = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...supabaseHeaders, 'Prefer': 'return=representation' },
        body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() })
      });
      const data = await r.json();
      return res.status(r.status).json(Array.isArray(data) ? (data[0] || {}) : data);
    }

    if (action === 'get_profile') {
      const r = await fetch(`${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(payload.email)}&select=*`, {
        headers: supabaseHeaders
      });
      const data = await r.json();
      return res.status(r.status).json(data[0] || null);
    }

    // ─── RESOURCES ──────────────────────────────────────────────────────────
    if (action === 'save_upload') {
      const body = upload || payload;
      const r = await fetch(`${supabaseUrl}/rest/v1/resources`, {
        method: 'POST',
        headers: { ...supabaseHeaders, 'Prefer': 'return=representation' },
        body: JSON.stringify(body)
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (action === 'get_uploads') {
      const uid = userId || (payload && payload.userId);
      if (!uid) return res.status(400).json({ error: 'userId required' });
      const r = await fetch(
        `${supabaseUrl}/rest/v1/resources?or=(user_id.eq.${uid},is_global.eq.true)&select=*&order=uploaded_at.desc`,
        { headers: supabaseHeaders }
      );
      const data = await r.json();
      return res.status(r.status).json({ data: Array.isArray(data) ? data : [] });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
