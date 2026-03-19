/**
 * POST /api/resend  — unified email delivery endpoint (Resend).
 *
 * Two call styles are supported, detected by which recipient field is present:
 *
 *  A) `to` field   → "resend" style: requires RESEND_API_KEY (500 if absent),
 *                    `name` optional (defaults to 'Student'), unknown type
 *                    falls back to the welcome template, sends from
 *                    hello@synaptiqai.co.uk.
 *
 *  B) `email` field → "email" style: validates email format + name, supports a
 *                    preview-HTML response when RESEND_API_KEY is absent,
 *                    unknown type returns 400, sends from hello@synaptiq.co.uk.
 */

import { applyHeaders } from './_lib.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const FROM_RESEND = 'Synaptiq <hello@synaptiqai.co.uk>';
const FROM_EMAIL  = 'Synaptiq <hello@synaptiq.co.uk>';
const SITE        = process.env.APP_URL || process.env.SITE_URL || 'https://synaptiq.co.uk';
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Shared template builder ───────────────────────────────────────────────────

function templates(name, stats, siteUrl) {
  const cta  = (label) => `<a href="${siteUrl}" style="display:inline-block;background:#C9A84C;color:#08090E;padding:.875rem 2rem;border-radius:10px;font-weight:700;text-decoration:none;margin-top:1rem">${label}</a>`;
  const foot = `<div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.07);font-size:.8rem;color:#6B7394;text-align:center">Synaptiq &middot; <a href="${siteUrl}/privacy" style="color:#6B7394">Privacy</a> &middot; <a href="${siteUrl}/terms" style="color:#6B7394">Terms</a></div></div>`;
  const wrap  = (header, body) => `<div style="font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;background:#0D0F18;color:#F0EEF8;border-radius:16px;overflow:hidden">${header}<div style="padding:2rem">${body}</div>${foot}`;
  const hdr   = (title, sub = '') => `<div style="background:linear-gradient(135deg,#C9A84C,#A07830);padding:2rem;text-align:center"><h1 style="font-family:'Syne',sans-serif;font-size:1.8rem;margin:0;color:#08090E">${title}</h1>${sub ? `<p style="opacity:.8;margin:.5rem 0 0;color:#08090E">${sub}</p>` : ''}</div>`;

  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return {
    welcome: {
      subject: `Welcome to Synaptiq, ${name}!`,
      html: wrap(hdr('Welcome to Synaptiq!', 'AI-Powered Learning for UK Students'), `<h2 style="color:#C9A84C">Welcome, ${name}!</h2><p>You're all set on Synaptiq. Here's what to try first:</p><ul style="line-height:2.2"><li><strong>Ask your AI Tutor</strong> — type any question</li><li><strong>Generate practice questions</strong> for your exam subjects</li><li><strong>Get essays marked</strong> with a predicted grade</li><li><strong>Photo a question</strong> from your textbook</li><li><strong>Watch a video explanation</strong> on anything you're stuck on</li></ul>${cta('Start Learning')}`)
    },
    trial_reminder: {
      subject: 'Your Synaptiq trial ends in 2 days — keep your access',
      html: wrap(hdr('Trial ending soon', 'Synaptiq — A-Level Maths AI Tutor'), `<h2 style="color:#C9A84C">Hi ${name},</h2><p>Your free trial ends in <strong>2 days</strong>. Subscribe now to keep full access.</p><div style="background:#181C2A;border-left:3px solid #C9A84C;border-radius:0 8px 8px 0;padding:1rem 1.25rem;margin:1.5rem 0"><p style="margin:0;font-size:.875rem;color:#6B7394">Student Plan: <strong style="color:#F0EEF8">£35/month</strong> or <strong style="color:#C9A84C">£199/year</strong>. Cancel any time.</p></div>${cta('Subscribe Now →')}`)
    },
    payment_confirmed: {
      subject: 'Your Synaptiq subscription is active!',
      html: wrap(hdr("You're in!"), `<p>Your <strong>${stats?.plan === 'homeschool' ? 'Homeschool' : 'Student'} Plan</strong> is now active. You have full access to all Synaptiq features.</p>${cta('Start Learning')}`)
    },
    payment_failed: {
      subject: 'Synaptiq — Payment failed',
      html: wrap('', `<h2 style="color:#C9A84C">Payment issue</h2><p>Hi ${name},</p><p>We couldn't process your latest payment. Please update your payment method.</p>${cta('Update Payment')}`)
    },
    weekly: {
      subject: 'Your weekly Synaptiq progress report',
      html: wrap(hdr('Weekly Report', `Week ending ${dateStr}`), `<h2 style="color:#C9A84C">Hi ${name}!</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:1.5rem 0"><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#C9A84C">${stats?.questions || 0}</div><div style="font-size:.8rem;color:#6B7394">Questions answered</div></div><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#4ADE80">${stats?.accuracy || 0}%</div><div style="font-size:.8rem;color:#6B7394">Accuracy</div></div><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#60A5FA">${stats?.xp || 0}</div><div style="font-size:.8rem;color:#6B7394">XP earned</div></div><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#FB923C">${stats?.streak || 0}</div><div style="font-size:.8rem;color:#6B7394">Day streak</div></div></div>${cta('Keep Going')}`)
    },
    exam_reminder: {
      subject: `${stats?.subject} exam in ${stats?.days} days — time to revise!`,
      html: wrap('', `<h2 style="color:#C9A84C">Exam reminder, ${name}</h2><p>Your <strong>${stats?.subject}</strong> exam is in <strong>${stats?.days} days</strong>.</p>${cta('Revise Now')}`)
    },
    parent_report: {
      subject: `${name}'s A-Level Maths progress report — Synaptiq`,
      html: wrap(hdr('Parent Progress Report', `Synaptiq A-Level Maths · ${dateStr}`), `<h2 style="color:#C9A84C">${name}'s progress</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:1.5rem 0"><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#C9A84C">${stats?.streak || 1}</div><div style="font-size:.8rem;color:#6B7394">Day streak</div></div><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#60A5FA">${stats?.questions || 0}</div><div style="font-size:.8rem;color:#6B7394">Questions answered</div></div><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#4ADE80">${stats?.topics || 0}</div><div style="font-size:.8rem;color:#6B7394">Topics explored</div></div><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#A78BFA">${stats?.xp || 0}</div><div style="font-size:.8rem;color:#6B7394">XP earned</div></div></div>${cta('View Full Dashboard')}`)
    },
    password_reset: {
      subject: 'Reset your Synaptiq password',
      html: wrap(hdr('Password Reset', 'Synaptiq — A-Level Maths AI Tutor'), `<h2 style="color:#C9A84C">Hi ${name},</h2><p>We received a request to reset your Synaptiq password. Use the link sent to your inbox — it expires in <strong>1 hour</strong>.</p><p style="color:#6B7394;font-size:.875rem">If you didn't request this, you can safely ignore this email.</p>${cta('Back to Synaptiq')}`)
    },
    goodbye: {
      subject: 'Your Synaptiq account has been deleted',
      html: `<div style="font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;background:#0D0F18;color:#F0EEF8;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#3a3a4a,#1e1e2e);padding:2rem;text-align:center"><h1 style="font-size:1.8rem;margin:0;color:#F0EEF8">Account Deleted</h1><p style="opacity:.6;margin:.5rem 0 0;color:#F0EEF8">We'll miss you, ${name}</p></div><div style="padding:2rem"><p>Your account and all data have been permanently deleted from our servers.</p><div style="background:#181C2A;border-radius:10px;padding:1.25rem;margin:1.5rem 0"><p style="margin:0 0 .5rem;font-weight:700;color:#C9A84C">Changed your mind?</p><p style="margin:0;font-size:.875rem;color:#6B7394">You can create a new Synaptiq account at any time.</p></div><a href="${siteUrl}" style="display:inline-block;background:#C9A84C;color:#08090E;padding:.875rem 2rem;border-radius:10px;font-weight:700;text-decoration:none;margin-top:.5rem">Create New Account</a></div>${foot}`
    },
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  applyHeaders(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, email, type, name, stats } = req.body;
  const siteUrl = process.env.SITE_URL || process.env.APP_URL || 'https://synaptiq.co.uk';

  // ── "resend" style: `to` field ────────────────────────────────────────────
  if (to !== undefined) {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return res.status(500).json({ error: 'Resend API key not configured' });

    if (!to) return res.status(400).json({ error: 'recipient (to) is required' });

    const tmpl  = templates(name || 'Student', stats, siteUrl);
    const tpl   = tmpl[type] || tmpl.welcome;

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_RESEND,
          to: Array.isArray(to) ? to : [to],
          subject: tpl.subject,
          html: tpl.html,
        }),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.message || data.error || 'Resend error' });
      return res.status(200).json({ id: data.id, success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── "email" style: `email` field ──────────────────────────────────────────
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid recipient email is required' });
  if (!name) return res.status(400).json({ error: 'name is required' });

  const tmpl = templates(name, stats, siteUrl);
  const tpl  = tmpl[type];
  if (!tpl) return res.status(400).json({ error: 'Unknown email type' });

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM_EMAIL, to: email, subject: tpl.subject, html: tpl.html }),
      });
      const result = await r.json();
      return res.status(200).json({ success: true, id: result.id });
    } catch (e) {
      return res.status(500).json({ error: 'Email send failed: ' + e.message });
    }
  }

  return res.status(200).json({ success: true, note: 'Add RESEND_API_KEY to send real emails', preview: tpl.html });
}
