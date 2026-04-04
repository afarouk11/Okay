import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendToClaude } from '@/lib/claude'
import { isRateLimited, getIp } from '@/lib/rateLimit'
import type { PlanTask } from '@/lib/supabase'

async function getUser(request: NextRequest) {
  const supabase = createServiceClient()
  if (!supabase) return { user: null, supabase: null }
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { user: null, supabase }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { user: null, supabase }
  return { user, supabase }
}

// GET — fetch today's plan
export async function GET(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:plan`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ plan: null })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('daily_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  return NextResponse.json({ plan: data ?? null })
}

// POST — generate a new daily plan with Claude
export async function POST(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:plan`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Gather context
  const [profileRes, mistakesRes, progressRes] = await Promise.all([
    supabase.from('profiles').select('name, year, subject, board, target, xp, level').eq('id', user.id).single(),
    supabase.from('mistakes').select('topic, mistake_type').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(5),
    supabase.from('topic_mastery').select('topic, mastery_level').eq('user_id', user.id).lt('mastery_level', 3).limit(5),
  ])

  const profile = profileRes.data
  const mistakes = mistakesRes.data ?? []
  const weakTopics = progressRes.data ?? []

  const contextLines: string[] = []
  if (profile) {
    contextLines.push(`Student: ${profile.name || 'Student'}, ${profile.year || 'A-Level'}, ${profile.subject || 'Maths'} (${profile.board || 'AQA'})`)
    if (profile.target) contextLines.push(`Target grade: ${profile.target}`)
  }
  if (mistakes.length > 0) {
    contextLines.push(`Recent mistakes: ${mistakes.map(m => m.topic).join(', ')}`)
  }
  if (weakTopics.length > 0) {
    contextLines.push(`Weak topics (low mastery): ${weakTopics.map(t => t.topic).join(', ')}`)
  }

  const prompt = `Create a focused daily study plan for today.
${contextLines.join('\n')}

Return ONLY a JSON array of 4-6 tasks. Each task must have:
- id: a short unique string (e.g. "task-1")
- topic: the maths topic (e.g. "Integration")
- task: a specific, actionable study task (1 sentence)
- done: false
- priority: "high" | "medium" | "low"

Example format:
[{"id":"task-1","topic":"Integration","task":"Practise 5 integration by substitution questions","done":false,"priority":"high"}]

Return ONLY the JSON array, no other text.`

  let tasks: PlanTask[]
  try {
    const raw = await sendToClaude(
      [{ role: 'user', content: prompt }],
      'You are a study planner. Return only valid JSON arrays. No markdown, no explanations.',
    )

    // Extract JSON array
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array found')
    tasks = JSON.parse(jsonMatch[0])
    if (!Array.isArray(tasks)) throw new Error('Not an array')
  } catch {
    // Fallback plan
    tasks = [
      { id: 'task-1', topic: 'Pure Mathematics', task: 'Review key differentiation rules', done: false, priority: 'high' },
      { id: 'task-2', topic: 'Statistics', task: 'Practice probability problems', done: false, priority: 'medium' },
      { id: 'task-3', topic: 'Mechanics', task: 'Study kinematics equations', done: false, priority: 'medium' },
    ]
  }

  const today = new Date().toISOString().split('T')[0]

  // Save to DB
  const { data, error } = await supabase.from('daily_plans').upsert({
    user_id: user.id,
    date: today,
    tasks,
    created_at: new Date().toISOString(),
  }, { onConflict: 'user_id,date' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan: data })
}

// PATCH — update a task's done status
export async function PATCH(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:plan`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ success: true })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { taskId, done } = body
  if (!taskId || typeof done !== 'boolean') {
    return NextResponse.json({ error: 'taskId and done are required' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]
  const { data: plan } = await supabase.from('daily_plans').select('tasks').eq('user_id', user.id).eq('date', today).single()
  if (!plan) return NextResponse.json({ error: 'No plan found for today' }, { status: 404 })

  const updatedTasks = (plan.tasks as PlanTask[]).map(t =>
    t.id === taskId ? { ...t, done } : t,
  )

  const { data, error } = await supabase
    .from('daily_plans')
    .update({ tasks: updatedTasks })
    .eq('user_id', user.id)
    .eq('date', today)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan: data })
}
