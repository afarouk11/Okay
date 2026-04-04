import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendToClaude, type Message } from '@/lib/claude'
import { isRateLimited, getIp } from '@/lib/rateLimit'

const TRIAL_DAILY_LIMIT = 20

async function getUser(request: NextRequest) {
  const supabase = createServiceClient()
  if (!supabase) return { user: null, supabase: null }
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { user: null, supabase }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { user: null, supabase }
  return { user, supabase }
}

export async function POST(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:chat`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { messages?: Message[]; systemPrompt?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { messages, systemPrompt } = body
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
  }

  // Validate and sanitise messages
  const sanitised: Message[] = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 8000) }))

  if (sanitised.length === 0) {
    return NextResponse.json({ error: 'No valid messages' }, { status: 400 })
  }

  // Check trial limits
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, trial_messages_today, trial_messages_reset_date')
    .eq('id', user.id)
    .single()

  if (profile && profile.plan !== 'homeschool') {
    const today = new Date().toISOString().split('T')[0]
    const needsReset = !profile.trial_messages_reset_date || profile.trial_messages_reset_date !== today
    const todayCount = needsReset ? 0 : (profile.trial_messages_today ?? 0)

    if (todayCount >= TRIAL_DAILY_LIMIT) {
      return NextResponse.json({
        error: 'Daily message limit reached. Upgrade for unlimited access.',
        code: 'TRIAL_LIMIT',
      }, { status: 429 })
    }

    // Fire-and-forget increment
    supabase.from('profiles').update({
      trial_messages_today: needsReset ? 1 : todayCount + 1,
      trial_messages_reset_date: today,
    }).eq('id', user.id).then(({ error: err }) => {
      if (err) console.error('trial increment failed:', err.message)
    })
  }

  // Call Claude
  let response: string
  try {
    response = await sendToClaude(sanitised, systemPrompt)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Claude error:', msg)
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }

  // Save to DB (fire-and-forget)
  const lastUserMsg = [...sanitised].reverse().find(m => m.role === 'user')
  if (lastUserMsg) {
    supabase.from('chat_history').insert([
      { user_id: user.id, role: 'user', content: lastUserMsg.content },
      { user_id: user.id, role: 'assistant', content: response },
    ]).then(() => {})
  }

  return NextResponse.json({ response })
}
