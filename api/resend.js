import { createClient } from '@supabase/supabase-js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_API = 'https://api.resend.com/emails';
const FROM = 'Synaptiq <hello@synaptiq.co.uk>';
const VALID_CATEGORIES = ['General support', 'Technical issue', 'Billing', 'Feature request', 'Other'];

function renderTemplate(type, name, stats = {}) {
  const s = stats || {};
  switch (type) {
    case 'welcome':
      return `<h1>Welcome, ${name}!</h1><p>Your Synaptiq account is ready.</p>`;
    case 'payment_confirmed':
      return `<h1>Payment Confirmed</h1><p>Hi ${name}, your ${s.plan || 'student'} plan is active.</p>`;
    case 'payment_failed':
      return `<h1>Payment Failed</h1><p>Hi ${name}, we could not process your payment.</p>`;
    case 'weekly':
      return `<h1>Your Weekly Report</h1><p>Hi ${name}! Questions: ${s.questions ?? 0}, Accuracy: ${s.accuracy ?? 0}%, XP: ${s.xp ?? 0}, Streak: ${s.streak ?? 0}</p>`;
    case 'parent_report':
      return `<h1>Parent Report</h1><p>Hi ${name}! Streak: ${s.streak ?? 0}, Questions: ${s.questions ?? 0}, Topics: ${s.topics ?? 0}, XP: ${s.xp ?? 0}</p>`;
    case 'password_reset':
      return `<h1>Password Reset</h1><p>Hi ${name}, click the link to reset your password.</p>`;
    case 'goodbye':
      return `<h1>Account Deleted</h1><p>Hi ${name}, your account has been deleted.</p>`;
    case 'trial_reminder':
      return `<h1>Trial Reminder</h1><p>Hi ${name}, your trial is ending soon.</p>`;
    default:
      return null;
  }
}

async function sendViaResend(apiKey, { to, subject, html }) {
  const r = await fetch(RESEND_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}

function checkInternalKey(req) {
  const provided = req.headers['x-internal-key'];
  const expected = process.env.INTERNAL_API_KEY;
  return expected && provided === expected;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const apiKey = process.env.RESEND_API_KEY;

  // ── Contact form ──────────────────────────────────────────────────────────
  if (body.type === 'contact') {
    const { name, email, message, category } = body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!message || message.length < 10) return res.status(400).json({ error: 'message must be at least 10 characters' });
    if (message.length > 5000) return res.status(400).json({ error: 'message must be 5000 characters or fewer' });
    const cat = category || 'General support';
    if (category && !VALID_CATEGORIES.includes(category))
      return res.status(400).json({ error: 'Invalid category' });

    if (!apiKey) return res.status(200).json({ success: true });

    try {
      const r = await fetch(RESEND_API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: ['hello@synaptiq.co.uk'],
          subject: `Contact: ${cat}`,
          html: `<p><b>From:</b> ${name} &lt;${email}&gt;</p><p><b>Category:</b> ${cat}</p><p>${message}</p>`,
        }),
      });
      if (!r.ok) return res.status(500).json({ error: 'Failed to send message' });
      return res.status(200).json({ success: true });
    } catch { return res.status(500).json({ error: 'Failed to send message' }); }
  }

  // ── Template preview / send (email field) ────────────────────────────────
  // Enter this path when: body has 'email' field, OR no apiKey (dev/preview mode) with no 'to' field.
  if (!('to' in body) && ('email' in body || !apiKey)) {
    const { email, name, type, stats } = body;
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Auth check when not using internal key and apiKey is set
    if (!checkInternalKey(req) && apiKey) {
      const token = req.headers?.authorization?.replace('Bearer ', '');
      if (token) {
        const db = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
          ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
          : null;
        if (db) {
          const { data: { user } } = await db.auth.getUser(token).catch(() => ({ data: { user: null } }));
          if (user && user.email !== email) {
            return res.status(403).json({ error: 'You can only send to your own email address' });
          }
        }
      }
    }

    if (!apiKey) {
      // Preview mode
      const html = renderTemplate(type, name, stats);
      if (!html) return res.status(400).json({ error: `Unknown email type: ${type}` });
      return res.status(200).json({ success: true, preview: html });
    }

    // Send mode
    const html = renderTemplate(type, name, stats) || renderTemplate('welcome', name, stats);
    const subject = type ? `Synaptiq — ${type.replace(/_/g, ' ')}` : 'Synaptiq';
    try {
      const result = await sendViaResend(apiKey, { to: email, subject, html });
      if (!result.ok) return res.status(result.status).json({ error: result.data.message || 'Send failed' });
      return res.status(200).json({ success: true, id: result.data.id });
    } catch {
      return res.status(500).json({ error: 'Failed to send email' });
    }
  }

  // ── Transactional send (to field) ─────────────────────────────────────────
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY is not configured' });

  // Auth: internal key OR bearer token
  const isInternal = checkInternalKey(req);
  if (!isInternal) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized — auth or internal key required' });
    const db = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
      ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
      : null;
    if (!db) return res.status(401).json({ error: 'Unauthorized' });
    const { data: { user } } = await db.auth.getUser(token).catch(() => ({ data: { user: null } }));
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const targetEmail = body.to || body.email;
    if (targetEmail && user.email !== targetEmail)
      return res.status(403).json({ error: "You can only send to your own email address" });
  }

  const to = body.to;
  if (!to) return res.status(400).json({ error: 'Recipient email (to) is required' });

  const { name, type, stats } = body;
  const html = renderTemplate(type, name || '', stats) || renderTemplate('welcome', name || '', stats);
  const subject = type ? `Synaptiq — ${type.replace(/_/g, ' ')}` : 'Synaptiq';

  try {
    const result = await sendViaResend(apiKey, { to, subject, html });
    if (!result.ok) return res.status(result.status).json({ error: result.data.message || 'Send failed' });
    return res.status(200).json({ id: result.data.id });
  } catch { return res.status(500).json({ error: 'Failed to send email' }); }
}
