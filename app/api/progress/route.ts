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
  const { action } = body

  // ── Adaptive learning actions (formerly /api/adaptive) ─────────────────────
  if (action === 'log_mistake') {
    const { topic, subtopic, mistake_type, details } = body
    if (!topic || !mistake_type) return NextResponse.json({ error: 'topic and mistake_type required' }, { status: 400 })

    await supabase.from('mistakes').insert({
      user_id: user.id,
      topic,
      subtopic: subtopic || null,
      mistake_type,
      details: details || null,
      logged_at: new Date().toISOString(),
    })

    const { data: existing } = await supabase
      .from('topic_mastery')
      .select('*')
      .eq('user_id', user.id)
      .eq('topic', topic)
      .single()

    if (existing) {
      const newTotal = existing.total_attempts + 1
      const newCorrect = existing.correct_attempts
      const newMastery = Math.max(1, Math.min(5, Math.round((newCorrect / newTotal) * 5)))
      await supabase.from('topic_mastery').update({
        total_attempts: newTotal,
        mastery_level: newMastery,
        last_practiced: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabase.from('topic_mastery').insert({
        user_id: user.id,
        topic,
        mastery_level: 1,
        correct_attempts: 0,
        total_attempts: 1,
        last_practiced: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true })
  }

  if (action === 'log_correct') {
    const { topic } = body
    if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

    const { data: existing } = await supabase
      .from('topic_mastery')
      .select('*')
      .eq('user_id', user.id)
      .eq('topic', topic)
      .single()

    if (existing) {
      const newCorrect = existing.correct_attempts + 1
      const newTotal = existing.total_attempts + 1
      const newMastery = Math.min(5, Math.round((newCorrect / newTotal) * 5))
      const nextReview = new Date()
      nextReview.setDate(nextReview.getDate() + Math.pow(2, existing.repetitions || 0))
      await supabase.from('topic_mastery').update({
        correct_attempts: newCorrect,
        total_attempts: newTotal,
        mastery_level: newMastery,
        repetitions: (existing.repetitions || 0) + 1,
        next_review_date: nextReview.toISOString().split('T')[0],
        last_practiced: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabase.from('topic_mastery').insert({
        user_id: user.id,
        topic,
        mastery_level: 2,
        correct_attempts: 1,
        total_attempts: 1,
        repetitions: 1,
        next_review_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        last_practiced: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true })
  }

  if (action === 'get_insights') {
    const today = new Date().toISOString().split('T')[0]
    const [weakRes, dueRes, profileRes] = await Promise.all([
      supabase.from('topic_mastery').select('*').eq('user_id', user.id).lt('mastery_level', 3).order('mastery_level').limit(5),
      supabase.from('topic_mastery').select('topic').eq('user_id', user.id).lte('next_review_date', today).limit(3),
      supabase.from('profiles').select('xp, level').eq('id', user.id).single(),
    ])

    return NextResponse.json({
      weakTopics: weakRes.data ?? [],
      dueForReview: dueRes.data ?? [],
      profile: profileRes.data,
    })
  }

  if (action === 'get_session_driven_topics') {
    const { data: sessions } = await supabase
      .from('jarvis_sessions')
      .select('topic, mastery_score, specific_errors, session_date')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })
      .limit(10)

    const errorFreq: Record<string, number> = {}
    const topicLowMastery: Record<string, number> = {}

    for (const s of (sessions ?? [])) {
      if (s.topic && typeof s.mastery_score === 'number' && s.mastery_score < 0.6) {
        topicLowMastery[s.topic] = (topicLowMastery[s.topic] ?? 0) + 1
      }
      for (const e of (Array.isArray(s.specific_errors) ? s.specific_errors : [])) {
        errorFreq[String(e)] = (errorFreq[String(e)] ?? 0) + 1
      }
    }

    const persistentErrors = Object.entries(errorFreq)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, frequency]) => ({ error, frequency }))

    const weakTopics = Object.entries(topicLowMastery)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, sessions_below_threshold]) => ({ topic, sessions_below_threshold }))

    return NextResponse.json({ persistent_errors: persistentErrors, weak_topics: weakTopics })
  }

  // ── Progress update ─────────────────────────────────────────────────────────
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

