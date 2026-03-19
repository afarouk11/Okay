/**
 * POST /api/resend
 * Sends transactional emails via Resend.
 * Uses `to` as the recipient field and requires RESEND_API_KEY.
 */

import { applyHeaders } from './_lib.js';

const FROM = 'Synaptiq <hello@synaptiqai.co.uk>';
const SITE = process.env.APP_URL || 'https://synaptiqai.co.uk';

function buildTemplate(type, name, stats) {
  const base = `<div style="font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;background:#0D0F18;color:#F0EEF8;border-radius:16px;overflow:hidden">`;
  const header = (title, sub = '') => `<div style="background:linear-gradient(135deg,#C9A84C,#A07830);padding:2rem;text-align:center"><h1 style="font-size:1.8rem;margin:0;color:#08090E">${title}</h1>${sub ? `<p style="opacity:.8;margin:.5rem 0 0;color:#08090E">${sub}</p>` : ''}</div>`;
  const cta = (label, href = SITE) => `<a href="${href}" style="display:inline-block;background:#C9A84C;color:#08090E;padding:.875rem 2rem;border-radius:10px;font-weight:700;text-decoration:none;margin-top:1rem">${label}</a>`;
  const foot = `<div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.07);font-size:.8rem;color:#6B7394;text-align:center">Synaptiq &middot; <a href="${SITE}/privacy" style="color:#6B7394">Privacy</a> &middot; <a href="${SITE}/terms" style="color:#6B7394">Terms</a></div></div>`;

  const templates = {
    welcome: {
      subject: `Welcome to Synaptiq, ${name}! 🎓`,
      html: `${base}${header('Welcome to Synaptiq!', 'A-Level Maths AI Tutor')}<div style="padding:2rem"><h2 style="color:#C9A84C">Hi ${name}!</h2><p>Your 7-day free trial is now active. Here's what to try first:</p><ul style="line-height:2.2;color:#b0b8cc"><li><strong style="color:#F0EEF8">Ask your AI Tutor</strong> — type any A-Level Maths question</li><li><strong style="color:#F0EEF8">Generate exam-style practice questions</strong> for any topic</li><li><strong style="color:#F0EEF8">Upload your mark scheme</strong> for board-aligned answers</li><li><strong style="color:#F0EEF8">Start spaced-repetition flashcards</strong> to lock in knowledge</li></ul>${cta('Start Learning →')}</div>${foot}`,
    },
    trial_reminder: {
      subject: `Your Synaptiq trial ends in 2 days — keep your access`,
      html: `${base}${header('Trial ending soon', 'Synaptiq — A-Level Maths AI Tutor')}<div style="padding:2rem"><h2 style="color:#C9A84C">Hi ${name},</h2><p>Your free trial ends in <strong>2 days</strong>. Subscribe now to keep full access to your AI tutor, flashcards, and progress data — no interruption.</p><div style="background:#181C2A;border-left:3px solid #C9A84C;border-radius:0 8px 8px 0;padding:1rem 1.25rem;margin:1.5rem 0"><p style="margin:0;font-size:.875rem;color:#b0b8cc">Student Plan: <strong style="color:#F0EEF8">£35/month</strong> or <strong style="color:#C9A84C">£199/year</strong> (save £221). Cancel any time.</p></div>${cta('Subscribe Now →')}</div>${foot}`,
    },
    weekly: {
      subject: `Your weekly Synaptiq progress report`,
      html: `${base}${header('Weekly Report', `Week ending ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`)}<div style="padding:2rem"><h2 style="color:#C9A84C">Hi ${name}!</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:1.5rem 0"><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#C9A84C">${stats?.questions || 0}</div><div style="font-size:.8rem;color:#6B7394">Questions answered</div></div><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#4ADE80">${stats?.accuracy || 0}%</div><div style="font-size:.8rem;color:#6B7394">Accuracy</div></div><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#60A5FA">${stats?.xp || 0}</div><div style="font-size:.8rem;color:#6B7394">XP earned</div></div><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#FB923C">${stats?.streak || 0} 🔥</div><div style="font-size:.8rem;color:#6B7394">Day streak</div></div></div>${cta('Keep Going →')}</div>${foot}`,
    },
    password_reset: {
      subject: `Reset your Synaptiq password`,
      html: `${base}${header('Password Reset', 'Synaptiq — A-Level Maths AI Tutor')}<div style="padding:2rem"><h2 style="color:#C9A84C">Hi ${name},</h2><p>We received a request to reset your password. Use the link sent to your inbox — it expires in <strong>1 hour</strong>.</p><p style="color:#6B7394;font-size:.875rem">If you didn't request this, you can safely ignore this email.</p>${cta('Back to Synaptiq →')}</div>${foot}`,
    },
    goodbye: {
      subject: `Your Synaptiq account has been deleted`,
      html: `${base}<div style="background:linear-gradient(135deg,#3a3a4a,#1e1e2e);padding:2rem;text-align:center"><h1 style="font-size:1.8rem;margin:0;color:#F0EEF8">Account Deleted</h1><p style="opacity:.6;margin:.5rem 0 0;color:#F0EEF8">We'll miss you, ${name}</p></div><div style="padding:2rem"><p>Your account and all data have been permanently deleted from our servers.</p><div style="background:#181C2A;border-radius:10px;padding:1.25rem;margin:1.5rem 0"><p style="margin:0 0 .5rem;font-weight:700;color:#C9A84C">Changed your mind?</p><p style="margin:0;font-size:.875rem;color:#6B7394">You can create a new account any time.</p></div>${cta('Create New Account →')}</div>${foot}`,
    },
  };

  return templates[type] || templates.welcome;
}

export default async function handler(req, res) {
  applyHeaders(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(500).json({ error: 'Resend API key not configured' });

  const { to, type, name = 'Student', stats } = req.body;
  if (!to) return res.status(400).json({ error: 'recipient (to) is required' });

  const template = buildTemplate(type, name, stats);

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: Array.isArray(to) ? to : [to],
        subject: template.subject,
        html: template.html,
      }),
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || data.error || 'Resend error' });
    return res.status(200).json({ id: data.id, success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
