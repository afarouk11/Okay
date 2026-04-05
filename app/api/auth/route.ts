import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { isRateLimited, getIp } from '@/lib/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://synaptiq.co.uk'
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/reset-password` })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
