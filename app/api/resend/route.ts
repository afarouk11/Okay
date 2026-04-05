import { NextRequest, NextResponse } from 'next/server'
import { isRateLimited, getIp } from '@/lib/rateLimit'

const FROM_ADDRESS = 'Synaptiq <hello@synaptiq.co.uk>'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CONTACT_CATEGORIES = [
  'General support',
  'Billing issue',
  'School / bulk licensing',
  'Privacy / data request',
  'Bug report',
  'Feature request',
  'Other',
]

function htmlEscape(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildTemplates(name: string, stats: Record<string, unknown>, siteUrl: string) {
  const cta = (label: string) =>
    `<a href="${siteUrl}" style="display:inline-block;background:#C9A84C;color:#08090E;padding:.875rem 2rem;border-radius:10px;font-weight:700;text-decoration:none;margin-top:1rem">${label}</a>`
  const foot = `<div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.07);font-size:.8rem;color:#6B7394;text-align:center">Synaptiq &middot; <a href="${siteUrl}/privacy" style="color:#6B7394">Privacy</a> &middot; <a href="${siteUrl}/terms" style="color:#6B7394">Terms</a></div></div>`
  const wrap = (header: string, body: string) =>
    `<div style="font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;background:#0D0F18;color:#F0EEF8;border-radius:16px;overflow:hidden">${header}<div style="padding:2rem">${body}</div>${foot}`
  const hdr = (title: string, sub = '') =>
    `<div style="background:linear-gradient(135deg,#C9A84C,#A07830);padding:2rem;text-align:center"><h1 style="font-family:'Syne',sans-serif;font-size:1.8rem;margin:0;color:#08090E">${title}</h1>${sub ? `<p style="opacity:.8;margin:.5rem 0 0;color:#08090E">${sub}</p>` : ''}</div>`

  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return {
    welcome: {
      subject: `Welcome to Synaptiq, ${name}!`,
      html: wrap(
        hdr('Welcome to Synaptiq!', 'AI-Powered Learning for UK Students'),
        `<h2 style="color:#C9A84C">Welcome, ${name}!</h2><p>You're all set on Synaptiq. Here's what to try first:</p><ul style="line-height:2.2"><li><strong>Ask your AI Tutor</strong> — type any question</li><li><strong>Generate practice questions</strong> for your exam subjects</li><li><strong>Get essays marked</strong> with a predicted grade</li><li><strong>Photo a question</strong> from your textbook</li><li><strong>Watch a video explanation</strong> on anything you're stuck on</li></ul>${cta('Start Learning')}`,
      ),
    },
    trial_reminder: {
      subject: 'Your Synaptiq trial ends in 2 days — keep your access',
      html: wrap(
        hdr('Trial ending soon', 'Synaptiq — A-Level Maths AI Tutor'),
        `<h2 style="color:#C9A84C">Hi ${name},</h2><p>Your free trial ends in <strong>2 days</strong>. Subscribe now to keep full access.</p><div style="background:#181C2A;border-left:3px solid #C9A84C;border-radius:0 8px 8px 0;padding:1rem 1.25rem;margin:1.5rem 0"><p style="margin:0;font-size:.875rem;color:#6B7394">Student Plan: <strong style="color:#F0EEF8">£35/month</strong> or <strong style="color:#C9A84C">£199/year</strong>. Cancel any time.</p></div>${cta('Subscribe Now →')}`,
      ),
    },
    payment_confirmed: {
      subject: 'Your Synaptiq subscription is active!',
      html: wrap(
        hdr("You're in!"),
        `<p>Your <strong>${stats?.plan === 'homeschool' ? 'Homeschool' : 'Student'} Plan</strong> is now active. You have full access to all Synaptiq features.</p>${cta('Start Learning')}`,
      ),
    },
    payment_failed: {
      subject: 'Synaptiq — Payment failed',
      html: wrap(
        '',
        `<h2 style="color:#C9A84C">Payment issue</h2><p>Hi ${name},</p><p>We couldn't process your latest payment. Please update your payment method.</p>${cta('Update Payment')}`,
      ),
    },
    weekly: {
      subject: 'Your weekly Synaptiq progress report',
      html: wrap(
        hdr('Weekly Report', `Week ending ${dateStr}`),
        `<h2 style="color:#C9A84C">Hi ${name}!</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:1.5rem 0"><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#C9A84C">${stats?.questions || 0}</div><div style="font-size:.8rem;color:#6B7394">Questions answered</div></div><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#4ADE80">${stats?.accuracy || 0}%</div><div style="font-size:.8rem;color:#6B7394">Accuracy</div></div><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#60A5FA">${stats?.xp || 0}</div><div style="font-size:.8rem;color:#6B7394">XP earned</div></div><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#FB923C">${stats?.streak || 0}</div><div style="font-size:.8rem;color:#6B7394">Day streak</div></div></div>${cta('Keep Going')}`,
      ),
    },
    exam_reminder: {
      subject: `${stats?.subject} exam in ${stats?.days} days — time to revise!`,
      html: wrap(
        '',
        `<h2 style="color:#C9A84C">Exam reminder, ${name}</h2><p>Your <strong>${stats?.subject}</strong> exam is in <strong>${stats?.days} days</strong>.</p>${cta('Revise Now')}`,
      ),
    },
    parent_report: {
      subject: `${name}'s A-Level Maths progress report — Synaptiq`,
      html: wrap(
        hdr('Parent Progress Report', `Synaptiq A-Level Maths · ${dateStr}`),
        `<h2 style="color:#C9A84C">${name}'s progress</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:1.5rem 0"><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#C9A84C">${stats?.streak || 1}</div><div style="font-size:.8rem;color:#6B7394">Day streak</div></div><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#60A5FA">${stats?.questions || 0}</div><div style="font-size:.8rem;color:#6B7394">Questions answered</div></div><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#4ADE80">${stats?.topics || 0}</div><div style="font-size:.8rem;color:#6B7394">Topics explored</div></div><div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center"><div style="font-size:2rem;font-weight:800;color:#A78BFA">${stats?.xp || 0}</div><div style="font-size:.8rem;color:#6B7394">XP earned</div></div></div>${cta('View Full Dashboard')}`,
      ),
    },
    password_reset: {
      subject: 'Reset your Synaptiq password',
      html: wrap(
        hdr('Password Reset', 'Synaptiq — A-Level Maths AI Tutor'),
        `<h2 style="color:#C9A84C">Hi ${name},</h2><p>We received a request to reset your Synaptiq password. Use the link sent to your inbox — it expires in <strong>1 hour</strong>.</p><p style="color:#6B7394;font-size:.875rem">If you didn't request this, you can safely ignore this email.</p>${cta('Back to Synaptiq')}`,
      ),
    },
    goodbye: {
      subject: 'Your Synaptiq account has been deleted',
      html: `<div style="font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;background:#0D0F18;color:#F0EEF8;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#3a3a4a,#1e1e2e);padding:2rem;text-align:center"><h1 style="font-size:1.8rem;margin:0;color:#F0EEF8">Account Deleted</h1><p style="opacity:.6;margin:.5rem 0 0;color:#F0EEF8">We'll miss you, ${name}</p></div><div style="padding:2rem"><p>Your account and all data have been permanently deleted from our servers.</p><div style="background:#181C2A;border-radius:10px;padding:1.25rem;margin:1.5rem 0"><p style="margin:0 0 .5rem;font-weight:700;color:#C9A84C">Changed your mind?</p><p style="margin:0;font-size:.875rem;color:#6B7394">You can create a new Synaptiq account at any time.</p></div><a href="${siteUrl}" style="display:inline-block;background:#C9A84C;color:#08090E;padding:.875rem 2rem;border-radius:10px;font-weight:700;text-decoration:none;margin-top:.5rem">Create New Account</a></div><div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.07);font-size:.8rem;color:#6B7394;text-align:center">Synaptiq &middot; <a href="${siteUrl}/privacy" style="color:#6B7394">Privacy</a> &middot; <a href="${siteUrl}/terms" style="color:#6B7394">Terms</a></div></div>`,
    },
  }
}

export async function POST(request: NextRequest) {
  const siteUrl = process.env.SITE_URL || process.env.APP_URL || 'https://synaptiq.co.uk'

  const body = await request.json().catch(() => ({})) as {
    to?: string | string[]
    email?: string
    type?: string
    name?: string
    stats?: Record<string, unknown>
    category?: string
    message?: string
  }
  const { to, email, type, name, stats, category, message } = body

  // ── Contact form ──────────────────────────────────────────────────────────
  if (type === 'contact') {
    const ip = getIp(request)
    if (isRateLimited(`${ip}:contact-email`, 5, 60 * 60_000)) {
      return NextResponse.json({ error: 'Too many requests — please try again later' }, { status: 429 })
    }
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    if (!message || message.trim().length < 10) return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 })
    if (message.length > 5000) return NextResponse.json({ error: 'Message must be under 5000 characters' }, { status: 400 })
    if (category && !CONTACT_CATEGORIES.includes(category)) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })

    const safeCategory = category || 'General support'
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      console.log('[resend] RESEND_API_KEY not set. Would have sent:', { name, email, safeCategory, message })
      return NextResponse.json({ success: true, note: 'RESEND_API_KEY not configured — email not sent' })
    }

    const html = `
      <h2>New Contact Form Submission</h2>
      <table cellpadding="6">
        <tr><td><strong>Name:</strong></td><td>${htmlEscape(name)}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${htmlEscape(email)}</td></tr>
        <tr><td><strong>Category:</strong></td><td>${htmlEscape(safeCategory)}</td></tr>
      </table>
      <h3>Message</h3>
      <p style="white-space:pre-wrap">${htmlEscape(message)}</p>
      <hr>
      <p style="color:#888;font-size:12px">Sent from Synaptiq contact form</p>
    `
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: 'support@synaptiq.co.uk',
          reply_to: email,
          subject: `[${safeCategory}] Message from ${name}`,
          html,
        }),
      })
      const data = await r.json() as { message?: string }
      if (!r.ok) return NextResponse.json({ error: data?.message || 'Failed to send email' }, { status: 500 })
      return NextResponse.json({ success: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  // ── "resend" style: `to` field ────────────────────────────────────────────
  if (to !== undefined) {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 })
    if (!to) return NextResponse.json({ error: 'recipient (to) is required' }, { status: 400 })

    const tmpl = buildTemplates(name || 'Student', stats || {}, siteUrl)
    const tpl = (tmpl as Record<string, { subject: string; html: string }>)[type || '']
    if (!tpl) return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: Array.isArray(to) ? to : [to],
          subject: tpl.subject,
          html: tpl.html,
        }),
      })
      const data = await r.json() as { id?: string; message?: string; error?: string }
      if (!r.ok) return NextResponse.json({ error: data.message || data.error || 'Resend error' }, { status: r.status })
      return NextResponse.json({ id: data.id, success: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  // ── "email" style: `email` field ──────────────────────────────────────────
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 })
  }
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const tmpl = buildTemplates(name, stats || {}, siteUrl)
  const tpl = (tmpl as Record<string, { subject: string; html: string }>)[type || '']
  if (!tpl) return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM_ADDRESS, to: email, subject: tpl.subject, html: tpl.html }),
      })
      const result = await r.json() as { id?: string }
      return NextResponse.json({ success: true, id: result.id })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      return NextResponse.json({ error: 'Email send failed: ' + msg }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, note: 'Add RESEND_API_KEY to send real emails', preview: tpl.html })
}
