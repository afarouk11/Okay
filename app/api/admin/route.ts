import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { isRateLimited, getIp } from '@/lib/rateLimit'

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
  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const { searchParams } = new URL(request.url)
  let action = searchParams.get('action')

  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}))
    action = action ?? body.action
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
    const body = request.method === 'POST'
      ? await request.json().catch(() => ({}))
      : {}
    const page = parseInt(searchParams.get('page') ?? body.page ?? '1', 10)
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
    const siteUrl = process.env.SITE_URL || process.env.APP_URL || 'https://synaptiq.co.uk'
    for (const u of users ?? []) {
      try {
        await fetch(`${siteUrl}/api/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'weekly',
            email: u.email,
            name: u.name,
            stats: { questions: u.questions_answered, accuracy: u.accuracy, xp: u.xp, streak: u.streak },
          }),
        })
        sent++
      } catch { failed++ }
    }
    logAdminAction(supabase, 'send_weekly_emails', ip, { sent, failed })
    return NextResponse.json({ sent, failed })
  }

  if (action === 'reset_users') {
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
