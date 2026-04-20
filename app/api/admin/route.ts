import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { isRateLimited, getIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FROM_EMAIL = process.env.EMAIL_FROM || 'Synapnode <hello@synaptiq.co.uk>'
const SITE_URL = process.env.SITE_URL || process.env.APP_URL || 'https://synaptiq.co.uk'

function hasValidAdminKey(adminKey: string | null) {
  const expectedKey = process.env.ADMIN_SECRET_KEY || ''
  if (!adminKey || !expectedKey) return false

  try {
    const providedHash = createHash('sha256').update(adminKey).digest()
    const expectedHash = createHash('sha256').update(expectedKey).digest()
    return timingSafeEqual(providedHash, expectedHash)
  } catch {
    return false
  }
}

function logAdminAction(
  supabase: ReturnType<typeof createServiceClient>,
  action: string,
  ip: string,
  metadata: Record<string, unknown> = {},
) {
  if (!supabase) return
  supabase.from('admin_audit_log')
    .insert({ action, ip, metadata })
    .then(null, () => {})
}

function weeklyEmailHtml(name: string, stats: { questions: number; accuracy: number; xp: number; streak: number }) {
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return `<div style="font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;background:#0D0F18;color:#F0EEF8;border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#4F8CFF,#22C55E);padding:2rem;text-align:center">
      <h1 style="font-size:1.8rem;margin:0;color:#fff">Weekly Report</h1>
      <p style="opacity:.8;margin:.5rem 0 0;color:#fff">Week ending ${dateStr}</p>
    </div>
    <div style="padding:2rem">
      <h2 style="color:#4F8CFF">Hi ${name}!</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:1.5rem 0">
        <div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center">
          <div style="font-size:2rem;font-weight:800;color:#4F8CFF">${stats.questions}</div>
          <div style="font-size:.8rem;color:#6B7394">Questions answered</div>
        </div>
        <div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center">
          <div style="font-size:2rem;font-weight:800;color:#22C55E">${stats.accuracy}%</div>
          <div style="font-size:.8rem;color:#6B7394">Accuracy</div>
        </div>
        <div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center">
          <div style="font-size:2rem;font-weight:800;color:#60A5FA">${stats.xp}</div>
          <div style="font-size:.8rem;color:#6B7394">XP earned</div>
        </div>
        <div style="background:#181C2A;border-radius:10px;padding:1rem;text-align:center">
          <div style="font-size:2rem;font-weight:800;color:#FB923C">${stats.streak}</div>
          <div style="font-size:.8rem;color:#6B7394">Day streak</div>
        </div>
      </div>
      <a href="${SITE_URL}/dashboard" style="display:inline-block;background:#4F8CFF;color:#fff;padding:.875rem 2rem;border-radius:10px;font-weight:700;text-decoration:none;margin-top:1rem">Keep Going</a>
    </div>
    <div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.07);font-size:.8rem;color:#6B7394;text-align:center">
      Synapnode &middot; <a href="${SITE_URL}/privacy" style="color:#6B7394">Privacy</a>
    </div>
  </div>`
}

async function sendWeeklyEmail(email: string, name: string, stats: { questions: number; accuracy: number; xp: number; streak: number }) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return false
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your weekly Synapnode progress report',
      html: weeklyEmailHtml(name, stats),
    }),
  })
  return r.ok
}

export async function GET(request: NextRequest) {
  return handleAdmin(request)
}

export async function POST(request: NextRequest) {
  return handleAdmin(request)
}

async function handleAdmin(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:admin`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const adminKey = request.headers.get('x-admin-key')
  if (!hasValidAdminKey(adminKey)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const { searchParams } = new URL(request.url)
  let action = searchParams.get('action')
  let body: Record<string, unknown> = {}

  if (request.method === 'POST') {
    body = await request.json().catch(() => ({}))
    action = action ?? (body.action as string | null)
  }

  if (action === 'stats') {
    const [users, active, paying] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .gte('last_active', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .in('subscription_status', ['active']),
    ])
    const mrr = (paying.count ?? 0) * 35
    const result = {
      total_users: users.count ?? 0,
      active_7d: active.count ?? 0,
      paying: paying.count ?? 0,
      mrr,
    }
    logAdminAction(supabase, 'stats', ip, result)
    return NextResponse.json(result)
  }

  if (action === 'users') {
    const page = parseInt((searchParams.get('page') ?? body.page as string ?? '1'), 10)
    const limit = 50
    const from = (page - 1) * limit
    const to = from + limit - 1
    const { data, count } = await supabase.from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    const pages = Math.ceil((count ?? 0) / limit)
    logAdminAction(supabase, 'users', ip, { page, total: count ?? 0 })
    return NextResponse.json({ users: data ?? [], total: count ?? 0, page, pages })
  }

  if (action === 'send_weekly_emails') {
    const { data: users } = await supabase.from('profiles')
      .select('email,name,xp,accuracy,streak,questions_answered')
      .eq('subscription_status', 'active')
    let sent = 0
    let failed = 0
    for (const u of users ?? []) {
      const ok = await sendWeeklyEmail(
        u.email,
        u.name ?? 'Student',
        { questions: u.questions_answered ?? 0, accuracy: u.accuracy ?? 0, xp: u.xp ?? 0, streak: u.streak ?? 0 },
      ).catch(() => false)
      if (ok) { sent++ } else { failed++ }
    }
    logAdminAction(supabase, 'send_weekly_emails', ip, { sent, failed })
    return NextResponse.json({ sent, failed })
  }

  if (action === 'reset_users') {
    // Require a server-side confirmation string to prevent accidental data loss
    if (body.confirm !== 'DELETE_ALL_USERS') {
      return NextResponse.json({ error: 'Confirmation string required: set confirm="DELETE_ALL_USERS"' }, { status: 400 })
    }
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })
    let deleted = 0
    const tables = ['activity_log', 'notes', 'progress', 'chat_history', 'flashcards', 'mistakes']
    for (const u of users ?? []) {
      for (const table of tables) {
        await supabase.from(table).delete().eq('user_id', u.id)
      }
      await supabase.from('profiles').delete().eq('id', u.id)
      await supabase.auth.admin.deleteUser(u.id)
      deleted++
    }
    logAdminAction(supabase, 'reset_users', ip, { deleted })
    return NextResponse.json({ ok: true, deleted, message: `Deleted ${deleted} account(s)` })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
