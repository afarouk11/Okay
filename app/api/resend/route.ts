import { NextRequest, NextResponse } from 'next/server'
import { isRateLimited, getIp } from '@/lib/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FROM = 'Synaptiq <hello@synaptiq.co.uk>'
const NOTIFY = 'hello@synaptiq.co.uk'

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
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function POST(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:contact`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many requests — try again in an hour.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const { name, email, category, message } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }
  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 })
  }
  const safeCategory = CONTACT_CATEGORIES.includes(category) ? category : 'Other'

  const safeName = htmlEscape(name.trim().slice(0, 120))
  const safeEmail = htmlEscape(email.trim().slice(0, 200))
  const safeMessage = htmlEscape(message.trim().slice(0, 4000)).replace(/\n/g, '<br>')

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Dev mode: log and return success so the UI works locally
    console.log('[contact] RESEND_API_KEY not set. Would have sent:', { safeName, safeEmail, safeCategory, message: message.trim().slice(0, 200) })
    return NextResponse.json({ success: true })
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px">
      <h2 style="color:#C9A84C">New contact form submission</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px;color:#888;width:120px">Name</td><td style="padding:8px">${safeName}</td></tr>
        <tr><td style="padding:8px;color:#888">Email</td><td style="padding:8px"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
        <tr><td style="padding:8px;color:#888">Category</td><td style="padding:8px">${htmlEscape(safeCategory)}</td></tr>
      </table>
      <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin-top:12px;font-size:14px;line-height:1.6">
        ${safeMessage}
      </div>
      <p style="color:#888;font-size:12px;margin-top:16px">Sent from Synaptiq contact form</p>
    </div>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: NOTIFY,
        reply_to: email.trim(),
        subject: `[Contact] ${safeCategory} — ${safeName}`,
        html,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[resend] email failed:', err)
      return NextResponse.json({ error: 'Failed to send — please try emailing hello@synaptiq.co.uk directly.' }, { status: 502 })
    }
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  return NextResponse.json({ success: true })
}
