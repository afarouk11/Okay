import { createClient } from '@supabase/supabase-js';
import { applyHeaders, isRateLimited, getIp } from './_lib.js';
import { timingSafeEqual, createHash } from 'crypto';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PLANS = ['student', 'home', 'homeschool'];
const MS_PER_DAY = 86_400_000;

/** Constant-time string comparison to prevent timing-based inference. */
function safeStringEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

// ─── Supabase REST proxy helpers ──────────────────────────────────────────────

function sbaHeaders(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

// Actions that bypass the Supabase JS client library and call Supabase REST directly.
// Env vars are read at request time so tests that set them in beforeEach work
// without needing the module-level JS client to be initialised.
const PROXY_ACTIONS = new Set([
  'create_auth_user', 'verify_login', 'upsert_profile',
  'patch_profile', 'get_profile', 'forgot_password',
  'save_upload', 'get_uploads', 'leaderboard',
]);

// Send a branded transactional email via Resend (non-blocking helper)
async function sendEmail(to, name, type) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const siteUrl = process.env.SITE_URL || 'https://synaptiq.co.uk';
  const templates = {
    welcome: {
      subject: `Welcome to Synaptiq, ${name}!`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0D0F18;color:#F0EEF8;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#C9A84C,#A07830);padding:2rem;text-align:center"><h1 style="font-size:2rem;margin:0;color:#08090E">Synapti<span>q</span></h1><p style="opacity:.8;margin:.5rem 0 0;color:#08090E">AI-Powered A-Level Maths</p></div><div style="padding:2rem"><h2 style="color:#C9A84C">Welcome, ${name}!</h2><p>You're all set. Here's what to try first:</p><ul style="line-height:2.2"><li><strong>AI Tutor</strong> — ask any A-Level Maths question</li><li><strong>Browse Chapters</strong> — Pure 1 &amp; 2, Stats, Mechanics</li><li><strong>Generate Flashcards</strong> — AI builds your revision deck</li><li><strong>Practice Questions</strong> — exam-style with mark schemes</li></ul><a href="${siteUrl}" style="display:inline-block;background:#C9A84C;color:#08090E;padding:.875rem 2rem;border-radius:10px;font-weight:700;text-decoration:none;margin-top:1rem">Start Learning →</a></div><div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.07);font-size:.8rem;color:#6B7394;text-align:center">Synaptiq · <a href="${siteUrl}/privacy" style="color:#6B7394">Privacy</a></div></div>`
    },
    password_reset: {
      subject: 'Reset your Synaptiq password',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0D0F18;color:#F0EEF8;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#C9A84C,#A07830);padding:2rem;text-align:center"><h1 style="font-size:1.8rem;margin:0;color:#08090E">Password Reset</h1></div><div style="padding:2rem"><h2 style="color:#C9A84C">Hi ${name},</h2><p>We received a request to reset your Synaptiq password. Click the secure link sent separately to your inbox to set a new password.</p><div style="background:#181C2A;border-left:3px solid #C9A84C;border-radius:0 8px 8px 0;padding:1rem 1.25rem;margin:1.5rem 0"><p style="margin:0;font-size:.875rem;color:#6B7394">⏱ This link expires in <strong style="color:#F0EEF8">1 hour</strong>.</p></div><p style="color:#6B7394;font-size:.875rem">If you didn't request this, you can safely ignore this email.</p><a href="${siteUrl}" style="display:inline-block;background:#C9A84C;color:#08090E;padding:.875rem 2rem;border-radius:10px;font-weight:700;text-decoration:none;margin-top:1rem">Back to Synaptiq →</a></div><div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.07);font-size:.8rem;color:#6B7394;text-align:center">Synaptiq · <a href="${siteUrl}/privacy" style="color:#6B7394">Privacy</a></div></div>`
    },
    goodbye: {
      subject: 'Your Synaptiq account has been deleted',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0D0F18;color:#F0EEF8;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#2a2a3a,#1a1a2a);padding:2rem;text-align:center"><h1 style="font-size:1.8rem;margin:0;color:#F0EEF8">Account Deleted</h1><p style="opacity:.6;color:#F0EEF8;margin:.5rem 0 0">We'll miss you, ${name}</p></div><div style="padding:2rem"><p>Your Synaptiq account has been permanently deleted. All your data — flashcards, notes, progress, and chat history — has been removed.</p><div style="background:#181C2A;border-radius:10px;padding:1.25rem;margin:1.5rem 0"><p style="margin:0 0 .5rem;font-weight:700;color:#C9A84C">Changed your mind?</p><p style="margin:0;font-size:.875rem;color:#6B7394">You can create a new account at any time.</p></div><a href="${siteUrl}" style="display:inline-block;background:#C9A84C;color:#08090E;padding:.875rem 2rem;border-radius:10px;font-weight:700;text-decoration:none">Create New Account →</a></div><div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.07);font-size:.8rem;color:#6B7394;text-align:center">Synaptiq · <a href="${siteUrl}/privacy" style="color:#6B7394">Privacy</a></div></div>`
    }
  };
  const t = templates[type];
  if (!t) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Synaptiq <hello@synaptiq.co.uk>', to, subject: t.subject, html: t.html })
    });
  } catch (_) { /* non-blocking — never crash the main request */ }
}

// Safe Supabase init — won't crash if env vars are missing
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
} catch (_) {
  supabase = null;
}

export default async function handler(req, res) {
  applyHeaders(res, 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIp(req);
  if (isRateLimited(`${ip}:auth`, 20, 60_000)) {
    return res.status(429).json({ error: 'Too many requests — please try again later' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (_) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { action, email, password, name, plan, learning_difficulty, year_group, subjects, board, target } = body;

  if (!action) return res.status(400).json({ error: 'Missing action parameter' });

  // Delegate Supabase REST proxy actions before checking the JS client.
  if (PROXY_ACTIONS.has(action)) {
    return handleProxyAction(req, res, action, body);
  }

  if (!supabase) {
    return handleDemoMode(res, { action, email, password, name, plan, year_group, subjects, learning_difficulty, board, target });
  }

  try {
    if (action === 'signup') {
      if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
      if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
      if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
      if (plan && !VALID_PLANS.includes(plan)) return res.status(400).json({ error: 'Invalid plan' });

      const chosenPlan = plan || 'student';
      const trimmedName = name.trim();

      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password,
        email_confirm: true,
        user_metadata: { name: trimmedName, plan: chosenPlan }
      });
      if (error) {
        // Friendly duplicate email message
        if (error.message.includes('already') || error.message.includes('duplicate'))
          return res.status(400).json({ error: 'An account with this email already exists. Try logging in instead.' });
        return res.status(400).json({ error: error.message });
      }

      // Create profile row
      const profileData = {
        id: data.user.id, name: trimmedName, email: email.toLowerCase().trim(),
        plan: chosenPlan, subscription_status: 'free',
        learning_difficulty: learning_difficulty || 'none',
        year_group: year_group || '', subjects: subjects || ['Mathematics'],
        exam_board: board || '', target_grade: target || '',
        xp: 0, level: 1, streak: 1, longest_streak: 1,
        questions_answered: 0, accuracy: 0,
        last_active: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      };
      await supabase.from('profiles').upsert(profileData, { onConflict: 'id' });

      // Sign in the new user to generate a session token
      let token = null;
      try {
        const { data: session } = await supabase.auth.signInWithPassword({ email: email.toLowerCase().trim(), password });
        token = session?.session?.access_token || null;
      } catch (_) { /* token stays null — user can log in separately */ }

      // Welcome email (non-blocking)
      sendEmail(email.toLowerCase().trim(), trimmedName, 'welcome');

      return res.status(200).json({
        success: true, token,
        user: { ...data.user, ...profileData, id: data.user.id }
      });
    }

    if (action === 'login') {
      if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
      if (!password) return res.status(400).json({ error: 'Please enter your password' });

      let { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(), password
      });

      // If email isn't confirmed, return a clear message prompting verification.
      if (error && /email not confirmed/i.test(error.message)) {
        return res.status(401).json({ error: 'Please verify your email address before logging in. Check your inbox for a confirmation link.' });
      }

      if (error) return res.status(401).json({ error: 'Invalid email or password' });

      // Fetch profile, create one if missing
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (!profile) {
        profile = {
          id: data.user.id,
          name: data.user.user_metadata?.name || email.split('@')[0],
          email: email.toLowerCase().trim(),
          plan: 'student', subscription_status: 'free',
          xp: 0, level: 1, streak: 1, longest_streak: 1,
          questions_answered: 0, accuracy: 0,
          last_active: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        };
        await supabase.from('profiles').upsert(profile, { onConflict: 'id' });
      }

      // Update streak
      const today = new Date().toISOString().split('T')[0];
      if (profile.last_active !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const newStreak = profile.last_active === yesterday ? (profile.streak || 0) + 1 : 1;
        const longestStreak = Math.max(newStreak, profile.longest_streak || 0);
        await supabase.from('profiles').update({ last_active: today, streak: newStreak, longest_streak: longestStreak }).eq('id', data.user.id);
        profile.streak = newStreak;
        profile.longest_streak = longestStreak;
        profile.last_active = today;
      }

      return res.status(200).json({
        success: true,
        token: data.session.access_token,
        user: { ...data.user, ...profile }
      });
    }

    if (action === 'reset') {
      if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
      const siteUrl = process.env.SITE_URL || 'https://synaptiq.co.uk';
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), { redirectTo: `${siteUrl}/reset-password` });
      if (error) return res.status(400).json({ error: error.message });
      // Fetch name for branded email (best-effort)
      const { data: resetProfile } = await supabase.from('profiles').select('name').eq('email', email.toLowerCase().trim()).single();
      sendEmail(email.toLowerCase().trim(), resetProfile?.name || 'there', 'password_reset');
      return res.status(200).json({ success: true });
    }

    if (action === 'verify') {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No token' });
      if (token.startsWith('demo_token_')) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
      const { data, error } = await supabase.auth.getUser(token);
      if (error) return res.status(401).json({ error: 'Session expired. Please log in again.' });
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      return res.status(200).json({ success: true, user: { ...data.user, ...profile } });
    }

    if (action === 'update_profile') {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No token' });
      const { data: authData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr) return res.status(401).json({ error: 'Invalid token' });
      const { exam_date } = body;
      const updates = {};
      if (name) updates.name = name.trim();
      if (learning_difficulty) updates.learning_difficulty = learning_difficulty;
      if (year_group) updates.year_group = year_group;
      if (subjects) updates.subjects = subjects;
      if (exam_date) updates.exam_date = exam_date;
      const { data: profile, error } = await supabase.from('profiles').update(updates).eq('id', authData.user.id).select().single();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ success: true, profile });
    }

    if (action === 'delete_account') {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No token' });
      const { data: authData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr) return res.status(401).json({ error: 'Invalid token' });
      // Fetch name + email before deleting for goodbye email
      const { data: delProfile } = await supabase.from('profiles').select('name, email').eq('id', authData.user.id).single();
      // Delete all user data, then auth user
      await supabase.from('activity_log').delete().eq('user_id', authData.user.id);
      await supabase.from('notes').delete().eq('user_id', authData.user.id);
      await supabase.from('progress').delete().eq('user_id', authData.user.id);
      await supabase.from('chat_history').delete().eq('user_id', authData.user.id);
      await supabase.from('flashcards').delete().eq('user_id', authData.user.id);
      await supabase.from('mistakes').delete().eq('user_id', authData.user.id);
      await supabase.from('profiles').delete().eq('id', authData.user.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      // Goodbye email (non-blocking, sent after deletion)
      if (delProfile?.email) sendEmail(delProfile.email, delProfile.name || 'there', 'goodbye');
      return res.status(200).json({ success: true });
    }

    if (action === 'get_profile') {
      const { email: profileEmail } = body.payload || {};
      if (!profileEmail) return res.status(400).json({ error: 'email required' });
      const { data: profile } = await supabase.from('profiles').select('*').eq('email', profileEmail).single();
      return res.status(200).json(profile || null);
    }

    if (action === 'patch_profile') {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Authentication required' });
      const { data: authData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr) return res.status(401).json({ error: 'Invalid token' });
      const { id: profileId, ...fields } = body.payload || {};
      if (!profileId) return res.status(400).json({ error: 'id required' });
      if (profileId !== authData.user.id) return res.status(403).json({ error: 'Forbidden' });
      // Strip is_admin — cannot self-escalate
      delete fields.is_admin;
      const { data: profile, error } = await supabase.from('profiles').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', profileId).select().single();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json(profile || {});
    }

    if (action === 'save_upload') {
      const upload = body.upload || body.payload;
      const { data, error } = await supabase.from('resources').insert(upload).select();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json(data);
    }

    if (action === 'get_uploads') {
      const uid = body.userId || (body.payload && body.payload.userId);
      if (!uid) return res.status(400).json({ error: 'userId required' });
      const { data, error } = await supabase.from('resources').select('*').or(`user_id.eq.${uid},is_global.eq.true`).order('uploaded_at', { ascending: false });
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ data: data || [] });
    }

    if (action === 'leaderboard') {
      const { userId: uid } = body.payload || {};
      const { data: top } = await supabase.from('profiles').select('name,xp,streak,avatar_emoji').order('xp', { ascending: false }).limit(20);
      let userRank = null;
      if (uid) {
        const { data: meRows } = await supabase.from('profiles').select('xp').eq('id', uid).single();
        if (meRows) {
          const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).gt('xp', meRows.xp || 0);
          userRank = (count || 0) + 1;
        }
      }
      return res.status(200).json({ top: top || [], userRank });
    }

    if (action === 'forgot_password') {
      const { email: resetEmail } = body.payload || {};
      if (!resetEmail || !EMAIL_RE.test(resetEmail)) return res.status(400).json({ error: 'A valid email is required' });
      const siteUrl = process.env.SITE_URL || 'https://synaptiq.co.uk';
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.toLowerCase().trim(), { redirectTo: `${siteUrl}/reset-password` });
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    if (action === 'peer_count') {
      // Count users who were active today — used for the real-data peer-presence bar.
      // Rate-limit this read-only action at the handler level (no auth required).
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('last_active', today);
      return res.status(200).json({ count: count || 0, date: today });
    }

    if (action === 'parent_view') {
      const { child_email, parent_code } = body;
      if (!child_email || !EMAIL_RE.test(child_email)) return res.status(400).json({ error: 'A valid child email is required' });
      if (!parent_code || typeof parent_code !== 'string' || parent_code.trim().length !== 6) return res.status(400).json({ error: 'Parent access code must be exactly 6 characters' });

      // Fetch child profile
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('id, name, plan, last_active, accuracy, streak, xp, level, exam_date, parent_code')
        .eq('email', child_email.toLowerCase().trim())
        .single();

      if (profErr || !profile) return res.status(404).json({ error: 'No account found for that email address' });

      // Validate parent_code — if no code is set on the profile, deny access
      if (!profile.parent_code) return res.status(403).json({ error: 'Parent access has not been enabled for this account' });
      if (!safeStringEqual(profile.parent_code.trim(), parent_code.trim())) return res.status(403).json({ error: 'Incorrect access code' });

      const childId = profile.id;

      // Weekly date range (last 7 days)
      const now = new Date();
      const weekAgo = new Date(now - 7 * MS_PER_DAY).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];

      // Weekly XP and study time from activity_log
      const { data: activityRows } = await supabase
        .from('activity_log')
        .select('date, xp_earned, questions_done')
        .eq('user_id', childId)
        .gte('date', weekAgo)
        .lte('date', today)
        .order('date', { ascending: true });

      const activity = activityRows || [];
      const weeklyXp = activity.reduce((s, r) => s + (r.xp_earned || 0), 0);
      // Build a 7-day map for the chart (date → xp_earned)
      const chartData = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * MS_PER_DAY).toISOString().split('T')[0];
        chartData[d] = 0;
      }
      for (const r of activity) {
        if (r.date in chartData) chartData[r.date] = (r.xp_earned || 0);
      }

      // Top 3 topics from progress this week
      const { data: progressRows } = await supabase
        .from('progress')
        .select('topic, subject, questions_done, xp_earned')
        .eq('user_id', childId)
        .gte('last_practiced', new Date(now - 7 * MS_PER_DAY).toISOString())
        .order('questions_done', { ascending: false })
        .limit(3);

      const topTopics = (progressRows || []).map(r => ({ topic: r.topic || r.subject || 'General', questions: r.questions_done || 0 }));

      // Strip parent_code before returning
      const safeProfile = {
        name: profile.name,
        plan: profile.plan,
        last_active: profile.last_active,
        accuracy: profile.accuracy,
        streak: profile.streak,
        xp: profile.xp,
        level: profile.level,
        exam_date: profile.exam_date || null,
      };

      return res.status(200).json({
        success: true,
        profile: safeProfile,
        weekly: {
          xp: weeklyXp,
          chart: chartData,
          top_topics: topTopics,
        },
      });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    const msg = /fetch|network|ECONNREFUSED|ETIMEDOUT|socket|abort/i.test(e.message)
      ? 'Unable to reach the database. Please check your connection and try again.'
      : e.message;
    return res.status(500).json({ error: msg });
  }
}

function handleDemoMode(res, { action, email, password, name, plan, year_group, subjects, learning_difficulty }) {
  const makeUser = (id, e, n, extra = {}) => ({
    id, email: e, name: n,
    plan: plan || 'student', subscription_status: 'free',
    year_group: year_group || 'Year 13 (A-Level)',
    subjects: subjects || ['Mathematics'],
    learning_difficulty: learning_difficulty || 'none',
    exam_board: 'AQA',
    xp: 0, level: 1, streak: 1, longest_streak: 1,
    questions_answered: 0, accuracy: 0,
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString().split('T')[0],
    ...extra
  });

  if (action === 'signup') {
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    const demoId = 'demo_' + Date.now().toString(36);
    return res.status(200).json({
      success: true, token: 'demo_token_' + demoId,
      user: makeUser(demoId, email, name.trim())
    });
  }
  if (action === 'login') {
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
    if (!password) return res.status(400).json({ error: 'Please enter your password' });
    const demoId = 'demo_' + Buffer.from(email).toString('base64').slice(0, 12);
    return res.status(200).json({
      success: true, token: 'demo_token_' + demoId,
      user: makeUser(demoId, email, email.split('@')[0])
    });
  }
  if (action === 'verify') {
    return res.status(200).json({
      success: true,
      user: makeUser('demo', 'demo@synaptiq.app', 'Student')
    });
  }
  if (action === 'reset') return res.status(200).json({ success: true, message: 'If an account exists with this email, a reset link has been sent.' });
  if (action === 'update_profile') return res.status(200).json({ success: true, profile: { name, learning_difficulty, year_group, subjects } });
  if (action === 'delete_account') return res.status(200).json({ success: true });
  if (action === 'get_profile') return res.status(200).json({ id: 'demo', email: 'demo@synaptiq.app', name: 'Student', plan: 'student' });
  if (action === 'patch_profile') return res.status(200).json(body.payload || {});
  if (action === 'save_upload') return res.status(200).json([]);
  if (action === 'get_uploads') return res.status(200).json({ data: [] });
  if (action === 'leaderboard') return res.status(200).json({ top: [], userRank: null });
  if (action === 'forgot_password') return res.status(200).json({ ok: true });
  if (action === 'peer_count') return res.status(200).json({ count: 0, date: new Date().toISOString().split('T')[0] });
  return res.status(400).json({ error: 'Unknown action' });
}

// ─── Supabase REST proxy handler ─────────────────────────────────────────────
// Uses raw fetch() against Supabase REST/Auth APIs so env vars are resolved
// at request time — allowing tests to set them in beforeEach without needing
// the module-level JS client to be initialised.

async function handleProxyAction(req, res, action, body) {
  const url = process.env.SUPABASE_URL;
  const svcKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !svcKey) {
    return res.status(500).json({ error: 'Supabase configuration is missing' });
  }

  const { payload } = body;

  // Helper: extract and validate the caller's JWT, returning the user's ID or null.
  // Only called for actions that require the caller to be the owner of the resource.
  async function getCallerUserId() {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token || token.startsWith('demo_token_')) return null;
    const anonKey = process.env.SUPABASE_ANON_KEY || svcKey;
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { ...sbaHeaders(anonKey), Authorization: `Bearer ${token}` }
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.id || null;
  }

  try {
    if (action === 'create_auth_user') {
      const { email, password } = payload || {};
      if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
      const r = await fetch(`${url}/auth/v1/admin/users`, {
        method: 'POST', headers: sbaHeaders(svcKey),
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      return res.status(200).json({ id: data.id, email: data.email });
    }

    if (action === 'verify_login') {
      const { email, password } = payload || {};
      if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
      const anonKey = process.env.SUPABASE_ANON_KEY;
      if (!anonKey) return res.status(500).json({ error: 'Supabase anon key is missing' });
      const loginR = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: sbaHeaders(anonKey),
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginR.json();
      if (!loginR.ok) return res.status(401).json({ error: loginData.error_description || 'Invalid credentials' });
      const uid = loginData.user?.id;
      const profileR = await fetch(
        `${url}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=*`,
        { headers: sbaHeaders(svcKey) },
      );
      const profiles = await profileR.json();
      if (Array.isArray(profiles) && profiles.length > 0) return res.status(200).json(profiles[0]);
      const createR = await fetch(`${url}/rest/v1/profiles`, {
        method: 'POST',
        headers: { ...sbaHeaders(svcKey), Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ id: uid, email, name: email.split('@')[0], plan: 'free' }),
      });
      const created = await createR.json();
      return res.status(200).json(Array.isArray(created) ? created[0] : created);
    }

    if (action === 'forgot_password') {
      const { email } = payload || {};
      if (!email) return res.status(400).json({ error: 'email is required' });
      const anonKey = process.env.SUPABASE_ANON_KEY;
      if (!anonKey) return res.status(500).json({ error: 'Supabase anon key is missing' });
      await fetch(`${url}/auth/v1/recover`, {
        method: 'POST', headers: sbaHeaders(anonKey),
        body: JSON.stringify({ email }),
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'upsert_profile') {
      // Strip is_admin — callers cannot elevate their own privileges
      const safePayload = { ...(payload || {}) };
      delete safePayload.is_admin;
      const callerId = await getCallerUserId();
      if (!callerId) return res.status(401).json({ error: 'Authentication required' });
      if (safePayload.id && safePayload.id !== callerId) return res.status(403).json({ error: 'Forbidden' });
      const r = await fetch(`${url}/rest/v1/profiles`, {
        method: 'POST',
        headers: { ...sbaHeaders(svcKey), Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(safePayload),
      });
      const data = await r.json();
      return res.status(200).json(Array.isArray(data) ? data[0] : data);
    }

    if (action === 'patch_profile') {
      const { id, ...rest } = payload || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      // Strip is_admin — callers cannot elevate their own privileges
      delete rest.is_admin;
      const callerId = await getCallerUserId();
      if (!callerId) return res.status(401).json({ error: 'Authentication required' });
      if (id !== callerId) return res.status(403).json({ error: 'Forbidden' });
      const r = await fetch(`${url}/rest/v1/profiles?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...sbaHeaders(svcKey), Prefer: 'return=representation' },
        body: JSON.stringify(rest),
      });
      const data = await r.json();
      return res.status(200).json(Array.isArray(data) ? data[0] : data);
    }

    if (action === 'get_profile') {
      const callerId = await getCallerUserId();
      if (!callerId) return res.status(401).json({ error: 'Authentication required' });
      const { email } = payload || {};
      if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
      const r = await fetch(
        `${url}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=*`,
        { headers: sbaHeaders(svcKey) },
      );
      const data = await r.json();
      return res.status(200).json(Array.isArray(data) ? data[0] : data);
    }

    if (action === 'save_upload') {
      const callerId = await getCallerUserId();
      if (!callerId) return res.status(401).json({ error: 'Authentication required' });
      const uploadPayload = payload || {};
      // Force user_id to be the caller's — prevents uploading on behalf of others
      const safeUpload = { ...uploadPayload, user_id: callerId };
      const r = await fetch(`${url}/rest/v1/resources`, {
        method: 'POST',
        headers: { ...sbaHeaders(svcKey), Prefer: 'return=representation' },
        body: JSON.stringify(safeUpload),
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (action === 'get_uploads') {
      const callerId = await getCallerUserId();
      if (!callerId) return res.status(401).json({ error: 'Authentication required' });
      // Only return the caller's uploads (plus global resources)
      const r = await fetch(`${url}/rest/v1/resources?user_id=eq.${callerId}`, {
        headers: sbaHeaders(svcKey),
      });
      const data = await r.json();
      return res.status(200).json({ data: Array.isArray(data) ? data : [] });
    }

    if (action === 'leaderboard') {
      const { tab, userId: uid } = payload || {};
      const orderCol = tab === 'streak' ? 'streak' : 'xp';
      const topR = await fetch(
        `${url}/rest/v1/profiles?select=name,xp,streak,avatar_emoji&order=${orderCol}.desc&limit=20`,
        { headers: sbaHeaders(svcKey) },
      );
      const topData = await topR.json();
      const top = Array.isArray(topData) ? topData : [];
      if (!uid) return res.status(200).json({ top, userRank: null });
      const lastScore = top.length > 0 ? (top[top.length - 1][orderCol] ?? 0) : 0;
      const countR = await fetch(
        `${url}/rest/v1/profiles?select=id&${orderCol}=gt.${lastScore}`,
        { headers: sbaHeaders(svcKey) },
      );
      const countData = await countR.json();
      const countAboveTop = Array.isArray(countData) ? countData.length : 0;
      const meR = await fetch(
        `${url}/rest/v1/profiles?id=eq.${uid}&select=${orderCol},name`,
        { headers: sbaHeaders(svcKey) },
      );
      const meData = await meR.json();
      const me = Array.isArray(meData) && meData.length > 0 ? meData[0] : null;
      const myScore = me ? (me[orderCol] ?? 0) : 0;
      const aboveR = await fetch(
        `${url}/rest/v1/profiles?select=id&${orderCol}=gt.${myScore}`,
        { headers: sbaHeaders(svcKey) },
      );
      const aboveData = await aboveR.json();
      const userRank = (Array.isArray(aboveData) ? aboveData.length : 0) + 1;
      return res.status(200).json({ top, userRank, countAboveTop });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
