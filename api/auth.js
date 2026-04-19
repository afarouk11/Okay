import { createClient } from '@supabase/supabase-js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PLANS = ['student', 'home', 'homeschool'];

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

function demoHandler(body, res) {
  const { action, email, password, name, plan } = body || {};
  if (!action) return res.status(400).json({ error: 'action is required' });

  if (action === 'signup') {
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Valid email required' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    if (plan && !VALID_PLANS.includes(plan)) return res.status(400).json({ error: 'Invalid plan' });
    return res.status(200).json({ success: true, token: `demo_token_${Date.now()}`, user: { id: 'demo', email, name: name.trim() } });
  }
  if (action === 'login') {
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Valid email required' });
    if (!password) return res.status(400).json({ error: 'Password is required' });
    return res.status(200).json({ success: true, token: `demo_token_${Date.now()}`, user: { id: 'demo', email } });
  }
  if (action === 'reset') return res.status(200).json({ success: true });
  if (action === 'verify') return res.status(200).json({ success: true, user: { id: 'demo', email: 'demo@example.com' } });
  if (action === 'update_profile') return res.status(200).json({ success: true, profile: { ...body } });
  if (action === 'delete_account') return res.status(200).json({ success: true });
  return res.status(400).json({ error: 'Unknown action' });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ error: 'Invalid request body' }); }
  }
  body = body || {};

  if (!supabase) return demoHandler(body, res);

  const { action, email, password, name, plan } = body;
  if (!action) return res.status(400).json({ error: 'action is required' });

  if (action === 'signup') {
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Valid email required' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    if (plan && !VALID_PLANS.includes(plan)) return res.status(400).json({ error: 'Invalid plan' });
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { name: name.trim(), plan: plan || 'student' },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already') || msg.includes('duplicate'))
        return res.status(400).json({ error: 'An account with this email already exists' });
      return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({ success: true, user: data.user });
  }

  if (action === 'login') {
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
    if (!password) return res.status(400).json({ error: 'Please enter your password' });
    let signInData, signInError;
    try {
      const result = await supabase.auth.signInWithPassword({ email: email.toLowerCase().trim(), password });
      signInData = result.data;
      signInError = result.error;
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('network'))
        return res.status(500).json({ error: 'Unable to reach the database. Please check your connection.' });
      return res.status(500).json({ error: msg });
    }
    if (signInError) {
      if (/email not confirmed/i.test(signInError.message))
        return res.status(401).json({ error: 'Please verify your email address before logging in.' });
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const { user, session } = signInData;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let profile = null;
    try {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      profile = p;
    } catch { /* ignore */ }
    if (!profile) {
      await supabase.from('profiles').upsert({
        id: user.id, email: user.email,
        name: user.user_metadata?.name || user.email.split('@')[0],
        plan: 'student', xp: 0, level: 1,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } else {
      let streak = profile.streak || 0;
      const lastActive = profile.last_active;
      if (lastActive === yesterday) {
        streak += 1;
      } else if (lastActive && lastActive !== today) {
        streak = 1;
      }
      const longest = Math.max(profile.longest_streak || 0, streak);
      await supabase.from('profiles').update({ streak, longest_streak: longest, last_active: today }).eq('id', user.id);
      profile = { ...profile, streak, last_active: today };
    }
    return res.status(200).json({ token: session?.access_token, user: { ...user, ...(profile || {}), streak: profile?.streak }, profile });
  }

  if (action === 'reset') {
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const siteUrl = process.env.SITE_URL || 'https://synaptiq.co.uk';
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/reset-password` });
    return res.status(200).json({ success: true });
  }

  if (action === 'verify') {
    const token = req.headers.authorization?.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    if (token.startsWith('demo_token_')) return res.status(401).json({ error: 'Demo token not valid' });
    const { data: { user: verifiedUser }, error: verifyErr } = await supabase.auth.getUser(token);
    if (verifyErr || !verifiedUser) return res.status(401).json({ error: 'Invalid token' });
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', verifiedUser.id).single();
    return res.status(200).json({ success: true, user: verifiedUser, profile });
  }

  if (action === 'update_profile') {
    const token = req.headers.authorization?.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData?.user) return res.status(401).json({ error: 'Invalid token' });
    const uid = authData.user.id;
    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.year !== undefined) updates.year = body.year;
    if (body.subject !== undefined) updates.subject = body.subject;
    updates.updated_at = new Date().toISOString();
    const { data: profile, error: updateErr } = await supabase.from('profiles').update(updates).eq('id', uid).select().single();
    if (updateErr) return res.status(400).json({ error: updateErr.message });
    return res.status(200).json({ success: true, profile });
  }

  if (action === 'delete_account') {
    const token = req.headers.authorization?.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData?.user) return res.status(401).json({ error: 'Invalid token' });
    const uid = authData.user.id;
    await supabase.from('profiles').delete().eq('id', uid);
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(uid);
    if (deleteErr) return res.status(500).json({ error: deleteErr.message });
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
