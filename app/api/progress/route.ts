import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { isRateLimited, getIp } from '@/lib/rateLimit'

async function getUser(request: NextRequest) {
  const supabase = createServiceClient()
  if (!supabase) return { user: null, supabase: null }
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { user: null, supabase }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { user: null, supabase }
  return { user, supabase }
}

export async function GET(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:progress`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ progress: [], profile: null, mistakes: [], activity: [] })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [progressRes, profileRes, mistakesRes, activityRes] = await Promise.all([
    supabase.from('progress').select('*').eq('user_id', user.id),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('mistakes').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(10),
    supabase.from('activity_log').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(84),
  ])

  return NextResponse.json({
    progress: progressRes.data ?? [],
    profile: profileRes.data,
    mistakes: mistakesRes.data ?? [],
    activity: activityRes.data ?? [],
  })
}

export async function POST(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:progress`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ success: true })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { subject, topic, correct, total, xpEarned } = body

  if (typeof total === 'number' && total < 0) return NextResponse.json({ error: 'total must not be negative' }, { status: 400 })
  if (typeof correct === 'number' && typeof total === 'number' && correct > total) return NextResponse.json({ error: 'correct must not exceed total' }, { status: 400 })
  if (typeof xpEarned === 'number' && xpEarned < 0) return NextResponse.json({ error: 'xpEarned must not be negative' }, { status: 400 })

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  await supabase.from('progress').upsert({
    user_id: user.id,
    subject,
    topic,
    accuracy,
    questions_done: total,
    last_practiced: new Date().toISOString(),
  }, { onConflict: 'user_id,subject,topic' })

  await supabase.rpc('increment_user_stats', {
    uid: user.id,
    xp_add: xpEarned || 0,
    questions_add: total || 0,
  })

  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  if (existing) {
    await supabase.from('activity_log').update({
      questions_done: existing.questions_done + (total || 0),
      xp_earned: existing.xp_earned + (xpEarned || 0),
    }).eq('id', existing.id)
  } else {
    await supabase.from('activity_log').upsert({
      user_id: user.id,
      date: today,
      questions_done: total || 0,
      xp_earned: xpEarned || 0,
    }, { onConflict: 'user_id,date' })
  }

  return NextResponse.json({ success: true })
}
