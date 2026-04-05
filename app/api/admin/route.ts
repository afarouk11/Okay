import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { isRateLimited, getIp } from '@/lib/rateLimit'

function checkAuth(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key') ?? ''
  const expectedKey = process.env.ADMIN_SECRET_KEY ?? ''
  if (!expectedKey) return false
  try {
    const a = createHash('sha256').update(adminKey).digest()
    const b = createHash('sha256').update(expectedKey).digest()
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:admin`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'stats') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [usersResult, activeResult, xpResult, messagesResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('last_active', today.toISOString()),
      supabase.from('profiles').select('xp'),
      supabase.from('chat_history').select('id', { count: 'exact', head: true }),
    ])

    const rows = (xpResult.data ?? []) as { xp: number }[]
    const totalXp = rows.reduce((sum, row) => sum + (row.xp ?? 0), 0)

    const { data: planData } = await supabase.from('profiles').select('plan')
    const planBreakdown: Record<string, number> = {}
    for (const row of (planData ?? []) as { plan: string }[]) {
      const p = row.plan ?? 'unknown'
      planBreakdown[p] = (planBreakdown[p] ?? 0) + 1
    }

    return NextResponse.json({
      total_users: usersResult.count ?? 0,
      active_today: activeResult.count ?? 0,
      total_xp: totalXp,
      total_messages: messagesResult.count ?? 0,
      plan_breakdown: planBreakdown,
    })
  }

  if (action === 'users') {
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = 50
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    return NextResponse.json({
      users: data ?? [],
      total: count ?? 0,
      page,
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:admin`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  let body: { action?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { action } = body

  if (action === 'send_weekly_emails') {
    return NextResponse.json({
      sent: 0,
      message: 'Email sending not configured in this environment.',
    })
  }

  if (action === 'reset_users') {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
