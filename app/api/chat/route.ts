import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { streamToClaude, type Message } from '@/lib/claude'
import { isRateLimited, getIp } from '@/lib/rateLimit'

const TRIAL_DAILY_LIMIT = 20

// ── Topic extractor ───────────────────────────────────────────────────────────
// Lightweight keyword match — no extra API call, runs in the stream flush handler.
const TOPIC_PATTERNS: Array<[RegExp, string]> = [
  [/integrat|integral|\bint\b/, 'Integration'],
  [/differentiat|derivative|\bchain rule\b|\bproduct rule\b|\bquotient rule\b/, 'Differentiation'],
  [/trigonometr|\bsin\b|\bcos\b|\btan\b|\bsec\b|\bcosec\b|\bcot\b/, 'Trigonometry'],
  [/logarithm|\bln\b|\blog\b/, 'Logarithms'],
  [/binomial/, 'Binomial Expansion'],
  [/statistic|probability|\bnormal distribution\b|\bhypothesis\b|\bz.score\b/, 'Statistics'],
  [/mechanic|\bforce\b|\bvelocity\b|\bacceleration\b|\bkinematic\b|\bmoment\b/, 'Mechanics'],
  [/\bvector\b/, 'Vectors'],
  [/\bmatri(x|ces)\b/, 'Matrices'],
  [/complex number/, 'Complex Numbers'],
  [/sequence|series|\barithmetic\b|\bgeometric\b/, 'Sequences & Series'],
  [/\bproof\b|\binduction\b/, 'Proof'],
  [/algebra|\bequation\b|\bquadratic\b|\bpolynomial\b/, 'Algebra'],
  [/calculus/, 'Calculus'],
]

function extractTopic(text: string): string | null {
  const lower = text.toLowerCase()
  for (const [regex, topic] of TOPIC_PATTERNS) {
    if (regex.test(lower)) return topic
  }
  return null
}

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

  // 'homeschool' is the paid plan value in the DB (displayed as "Student Plan" in the UI).
  // Only free-plan users ('student' or null) are subject to the daily message limit.
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

  // Build adaptive system prompt from jarvis_sessions history.
  // Wrapped in try-catch: a Supabase network hiccup must not kill the whole request.
  let adaptiveSystem: string
  try {
    adaptiveSystem = await buildAdaptiveSystemPrompt(user.id, systemPrompt, supabase)
  } catch {
    adaptiveSystem = systemPrompt ?? ''
  }

  // Stream Claude response, tapping it to accumulate the full text for DB write
  let claudeStream: ReadableStream<Uint8Array>
  try {
    claudeStream = await streamToClaude(sanitised, adaptiveSystem)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Claude error:', msg)
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }

  const lastUserMsg = [...sanitised].reverse().find(m => m.role === 'user')
  const decoder = new TextDecoder()
  let accumulated = ''

  const tapped = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      accumulated += decoder.decode(chunk, { stream: true })
      controller.enqueue(chunk)
    },
    flush() {
      accumulated += decoder.decode()
      if (!lastUserMsg || !accumulated) return

      // Save chat history
      supabase.from('chat_history').insert([
        { user_id: user.id, role: 'user', content: lastUserMsg.content },
        { user_id: user.id, role: 'assistant', content: accumulated },
      ]).then(() => {})

      // Save session record for adaptive personalisation
      const topic = extractTopic(`${lastUserMsg.content} ${accumulated}`)
      if (topic) {
        supabase.from('jarvis_sessions').insert({
          user_id: user.id,
          topic,
          mastery_score: 0.5,   // neutral default; updated by dedicated assessment flow
          specific_errors: [],
        }).then(() => {})
      }
    },
  })

  return new Response(claudeStream.pipeThrough(tapped), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  })
}

// ─── Adaptive system prompt ───────────────────────────────────────────────────
// Prepends a [STUDENT CONTEXT] block to the system prompt based on:
//   - Recent jarvis_sessions: mastery_score + specific_errors
//   - topic_mastery: weak topics due for review
//   - profiles: exam_date, year, board, target
// This makes Jarvis feel like it actually knows the student.

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof import('@/lib/supabase').createServiceClient>>>

async function buildAdaptiveSystemPrompt(
  userId: string,
  callerSystem: string | undefined,
  supabase: SupabaseClient,
): Promise<string> {
  const today = new Date().toISOString().split('T')[0]

  const [profileRes, sessionsRes, weakRes, reviewRes] = await Promise.all([
    supabase.from('profiles')
      .select('name, year, board, target, exam_date, adhd_mode, dyslexia_mode, dyscalculia_mode')
      .eq('id', userId)
      .single(),
    supabase.from('jarvis_sessions')
      .select('topic, mastery_score, specific_errors')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .limit(5),
    supabase.from('topic_mastery')
      .select('topic, mastery_level, correct_attempts, total_attempts')
      .eq('user_id', userId)
      .lt('mastery_level', 3)
      .order('mastery_level', { ascending: true })
      .limit(5),
    supabase.from('topic_mastery')
      .select('topic')
      .eq('user_id', userId)
      .lte('next_review_date', today)
      .limit(3),
  ])

  const p = profileRes.data
  const sessions = sessionsRes.data ?? []
  const weakTopics = (weakRes.data ?? []).map(t => {
    const acc = t.total_attempts > 0 ? Math.round((t.correct_attempts / t.total_attempts) * 100) : 0
    return `${t.topic} (${acc}% accuracy, mastery ${t.mastery_level}/5)`
  })
  const dueTopics = (reviewRes.data ?? []).map(t => t.topic)

  // Aggregate specific_errors across sessions
  const errorFreq: Record<string, number> = {}
  const lowMastery: string[] = []
  for (const s of sessions) {
    if (s.topic && typeof s.mastery_score === 'number' && s.mastery_score < 0.5) {
      lowMastery.push(`${s.topic} (${Math.round(s.mastery_score * 100)}% session mastery)`)
    }
    for (const e of (Array.isArray(s.specific_errors) ? s.specific_errors : [])) {
      errorFreq[String(e)] = (errorFreq[String(e)] ?? 0) + 1
    }
  }
  const persistentErrors = Object.entries(errorFreq)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([err, c]) => `${err} (seen in ${c} sessions)`)

  // Accessibility notes
  const a11y: string[] = []
  if (p?.adhd_mode) a11y.push('ADHD: keep responses focused; use bullet points; chunk into short steps.')
  if (p?.dyslexia_mode) a11y.push('Dyslexia: clear headings; short sentences; prefer numbered lists.')
  if (p?.dyscalculia_mode) a11y.push('Dyscalculia: colour-code steps; use visual analogies; number every calculation step.')

  // Exam countdown
  let examNote: string | null = null
  if (p?.exam_date) {
    const daysLeft = Math.ceil((new Date(p.exam_date).getTime() - Date.now()) / 86400000)
    if (daysLeft > 0 && daysLeft <= 180) {
      examNote = `Exam in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — prioritise exam technique and past-paper practice.`
    }
  }

  const contextLines = [
    '[STUDENT CONTEXT — personalise your response with this]',
    p?.year    ? `Year group: ${p.year}` : null,
    p?.board   ? `Exam board: ${p.board}` : null,
    p?.target  ? `Target grade: ${p.target}` : null,
    examNote,
    a11y.length         ? `Accessibility: ${a11y.join(' ')}` : null,
    weakTopics.length   ? `Topics needing support: ${weakTopics.join(', ')}` : null,
    dueTopics.length    ? `Due for review today: ${dueTopics.join(', ')}` : null,
    persistentErrors.length ? `Persistent errors (address proactively): ${persistentErrors.join('; ')}` : null,
    lowMastery.length   ? `Recent low-mastery topics: ${lowMastery.slice(0, 3).join(', ')}` : null,
    '[/STUDENT CONTEXT]',
  ].filter(Boolean).join('\n')

  const base = callerSystem ?? ''
  // If no context was gathered (new user), fall back to base system prompt only
  const hasContext = weakTopics.length > 0 || persistentErrors.length > 0 || dueTopics.length > 0 || examNote
  return hasContext ? `${contextLines}\n\n${base}` : base
}
