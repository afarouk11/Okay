import { NextRequest, NextResponse } from 'next/server'
import { isRateLimited, getIp } from '@/lib/rateLimit'

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

export async function POST(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:contact`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many requests — please try again later' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const { name, email, category, message } = body as Record<string, string>

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  if (!message || message.trim().length < 10) return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 })
  if (message.length > 5000) return NextResponse.json({ error: 'Message must be under 5000 characters' }, { status: 400 })
  if (category && !CONTACT_CATEGORIES.includes(category)) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })

  const safeCategory = category || 'General support'
  const resendKey = process.env.RESEND_API_KEY

  if (!resendKey) {
    console.log('[contact] RESEND_API_KEY not set. Would have sent:', { name, email, safeCategory, message })
    return NextResponse.json({ success: true, note: 'RESEND_API_KEY not configured — email not sent' })
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2>New Contact Form Submission</h2>
      <table cellpadding="6">
        <tr><td><strong>Name:</strong></td><td>${htmlEscape(name)}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${htmlEscape(email)}</td></tr>
        <tr><td><strong>Category:</strong></td><td>${htmlEscape(safeCategory)}</td></tr>
      </table>
      <h3>Message</h3>
      <p style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:6px">${htmlEscape(message)}</p>
      <hr>
      <p style="color:#888;font-size:12px">Sent from Synaptiq contact form</p>
    </div>
  `

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Synaptiq <hello@synaptiq.co.uk>',
        to: 'support@synaptiq.co.uk',
        reply_to: email,
        subject: `[${safeCategory}] Message from ${name}`,
        html,
      }),
    })
    const data = await r.json()
    if (!r.ok) return NextResponse.json({ error: data?.message || 'Failed to send email' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
