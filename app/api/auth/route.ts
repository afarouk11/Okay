import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase'
import { isRateLimited, getIp } from '@/lib/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FROM_EMAIL = process.env.EMAIL_FROM || 'Synaptiq <hello@synaptiq.co.uk>'
const SITE_URL = process.env.SITE_URL || process.env.APP_URL || 'https://synaptiq.co.uk'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getResource(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  return (searchParams.get('resource') || 'auth').toLowerCase()
}

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
      Synaptiq &middot; <a href="${SITE_URL}/privacy" style="color:#6B7394">Privacy</a>
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
      subject: 'Your weekly Synaptiq progress report',
      html: weeklyEmailHtml(name, stats),
    }),
  })
  return r.ok
}

export async function GET(request: NextRequest) {
  if (getResource(request) !== 'admin') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
  return handleAdmin(request)
}

export async function POST(request: NextRequest) {
  if (getResource(request) === 'admin') {
    return handleAdmin(request)
  }
  return handleAuth(request)
}

async function handleAuth(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:auth`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const { action, email, password, name, plan } = body

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Auth service not configured' }, { status: 503 })
  }

  if (action === 'register') {
    if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    if (!password || password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    if (!name || !name.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const normalisedEmail = email.toLowerCase().trim()
    const trimmedName = name.trim()
    const chosenPlan = plan || 'student'

    const { data, error } = await supabase.auth.admin.createUser({
      email: normalisedEmail,
      password,
      email_confirm: true,
      user_metadata: { name: trimmedName, plan: chosenPlan },
    })

    if (error) {
      if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('duplicate')) {
        return NextResponse.json({ error: 'An account with this email already exists. Try signing in instead.' }, { status: 400 })
      }
      if (
        error.message.toLowerCase().includes('authentication') ||
        error.message.toLowerCase().includes('not a service_role') ||
        error.message.toLowerCase().includes('invalid api key') ||
        error.message.toLowerCase().includes('unauthorized')
      ) {
        console.error('[auth/register] Supabase admin API auth error:', error.message)
        return NextResponse.json({ error: 'Registration is temporarily unavailable. Please try again later.' }, { status: 503 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await supabase.from('profiles').upsert({
      id: data.user.id,
      email: normalisedEmail,
      name: trimmedName,
      plan: chosenPlan,
      xp: 0,
      level: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    return NextResponse.json({ user: data.user })
  }

  if (action === 'verify') {
    const token = body.token
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    return NextResponse.json({ user, profile })
  }

  if (action === 'forgot_password') {
    if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.SITE_URL || 'https://synaptiq.co.uk'
    await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), { redirectTo: `${siteUrl}/reset-password` })
    return NextResponse.json({ success: true })
  }

  if (action === 'peer_count') {
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('last_active', today)
    return NextResponse.json({ count: count ?? 0, date: today })
  }

  if (action === 'delete_account') {
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }

    const { error: profileDeleteError } = await supabase.from('profiles').delete().eq('id', user.id)
    if (profileDeleteError) {
      return NextResponse.json({ error: profileDeleteError.message }, { status: 500 })
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (action === 'parent_view') {
    const { child_email, parent_code } = body as { child_email?: string; parent_code?: string }

    if (!child_email || !EMAIL_RE.test(child_email)) {
      return NextResponse.json({ error: 'Valid child email required' }, { status: 400 })
    }
    if (!parent_code || typeof parent_code !== 'string' || parent_code.trim().length !== 6) {
      return NextResponse.json({ error: 'Access code must be exactly 6 characters' }, { status: 400 })
    }

    if (isRateLimited(`${ip}:parent_view:${child_email.toLowerCase().trim()}`, 5, 60_000)) {
      return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, plan, last_active, accuracy, streak, xp, level, exam_date, parent_code')
      .eq('email', child_email.toLowerCase().trim())
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (!profile.parent_code) {
      return NextResponse.json({ error: 'Parent access not enabled for this account' }, { status: 403 })
    }

    const storedBuf = Buffer.from(profile.parent_code)
    const inputBuf = Buffer.from(parent_code.trim())
    const codesMatch = storedBuf.length === inputBuf.length && timingSafeEqual(storedBuf, inputBuf)

    if (!codesMatch) {
      return NextResponse.json({ error: 'Incorrect access code' }, { status: 403 })
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [{ data: activityRows }, { data: progressRows }] = await Promise.all([
      supabase
        .from('activity_log')
        .select('date, questions_done, xp_earned')
        .eq('user_id', profile.id)
        .gte('date', sevenDaysAgo)
        .order('date'),
      supabase
        .from('progress')
        .select('topic, subject')
        .eq('user_id', profile.id)
        .gte('created_at', sevenDaysAgo)
        .limit(10),
    ])

    const activity = activityRows ?? []
    const totalXp = activity.reduce((s: number, r: { xp_earned?: number }) => s + (r.xp_earned ?? 0), 0)
    const totalQuestions = activity.reduce((s: number, r: { questions_done?: number }) => s + (r.questions_done ?? 0), 0)
    const daysActive = activity.filter((r: { questions_done?: number }) => (r.questions_done ?? 0) > 0).length

    const topicCounts: Record<string, number> = {}
    for (const row of (progressRows ?? [])) {
      const key = row.topic || row.subject || 'Unknown'
      topicCounts[key] = (topicCounts[key] ?? 0) + 1
    }
    const top3Topics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic, count]) => ({ topic, count }))

    return NextResponse.json({
      profile: {
        name: profile.name,
        plan: profile.plan,
        last_active: profile.last_active,
        accuracy: profile.accuracy,
        streak: profile.streak,
        xp: profile.xp,
        level: profile.level,
        exam_date: profile.exam_date,
      },
      weekly: { xp: totalXp, questions: totalQuestions, days_active: daysActive },
      topics: top3Topics,
      activity,
    })
  }

  if (action === 'login') {
    if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    if (!password) return NextResponse.json({ error: 'Please enter your password' }, { status: 400 })

    const normalisedEmail = email.toLowerCase().trim()

    const { createClient } = await import('@supabase/supabase-js')
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data, error: signInError } = await anonClient.auth.signInWithPassword({
      email: normalisedEmail,
      password,
    })

    if (signInError) {
      if (/email not confirmed/i.test(signInError.message)) {
        return NextResponse.json({ error: 'Please verify your email address before logging in. Check your inbox for a confirmation link.' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
    if (!profile) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name: data.user.user_metadata?.name || normalisedEmail.split('@')[0],
        email: normalisedEmail,
        plan: 'student',
        xp: 0,
        level: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
    }

    return NextResponse.json({
      token: data.session?.access_token,
      user: data.user,
      profile: profile ?? null,
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
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
      ok ? sent++ : failed++
    }
    logAdminAction(supabase, 'send_weekly_emails', ip, { sent, failed })
    return NextResponse.json({ sent, failed })
  }

  if (action === 'reset_users') {
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
