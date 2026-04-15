import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { isRateLimited, getIp } from '@/lib/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
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
      // Supabase returns "Authentication required" (HTTP 401) when the service
      // role key is invalid or absent. Never expose that internal detail to the
      // browser — it looks like the *user* needs to authenticate, which is
      // confusing on a sign-up form.
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

    // Create matching profile row so the app can load user data
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
    // Count users active today (last_active = today) — no auth required, read-only stat
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
    const codesMatch =
      storedBuf.length === inputBuf.length &&
      timingSafeEqual(storedBuf, inputBuf)

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Auth service not configured' }, { status: 503 })
    }

    // Use anon client for password sign-in (service client doesn't support signInWithPassword)
    const { createClient } = await import('@supabase/supabase-js')
    const anonClient = createClient(supabaseUrl, supabaseAnonKey)

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

    // Ensure profile exists
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
    if (!profile) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name: data.user.user_metadata?.name || normalisedEmail.split('@')[0],
        email: normalisedEmail,
        plan: 'student',
        xp: 0, level: 1,
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
