import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { isRateLimited, getIp } from '@/lib/rateLimit'

const ALLOWED_BOARDS = new Set(['AQA', 'Edexcel', 'OCR', 'WJEC'])

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
  if (isRateLimited(`${ip}:papers`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { topic, exam_board, difficulty, count, include_mark_scheme } = body

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 })
  }
  const safeTopic = topic.trim().slice(0, 120)

  if (!exam_board || !ALLOWED_BOARDS.has(exam_board)) {
    return NextResponse.json({
      error: `exam_board must be one of: ${[...ALLOWED_BOARDS].join(', ')}`,
    }, { status: 400 })
  }

  const parsedDifficulty = Number(difficulty)
  if (!Number.isInteger(parsedDifficulty) || parsedDifficulty < 1 || parsedDifficulty > 5) {
    return NextResponse.json({ error: 'difficulty must be an integer between 1 and 5' }, { status: 400 })
  }

  const parsedCount = count !== undefined ? Number(count) : 3
  if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 5) {
    return NextResponse.json({ error: 'count must be an integer between 1 and 5' }, { status: 400 })
  }

  const includeMarkScheme = include_mark_scheme !== false

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })

  const systemPrompt =
    `You are an expert ${exam_board} A-Level Maths examiner. ` +
    `Generate ${parsedCount} exam-style question${parsedCount !== 1 ? 's' : ''} on ${safeTopic} ` +
    `at difficulty ${parsedDifficulty}/5. ` +
    `For each question include: the question text, marks, working hints, and a full mark scheme. ` +
    `Format as a JSON array: [{"question":"...","marks":0,"hints":["..."],"mark_scheme":"..."}]. ` +
    `Match the exact style, notation and language of real ${exam_board} A-Level papers. ` +
    `Return only the JSON array — no surrounding text or markdown fences.`

  const userMessage = includeMarkScheme
    ? 'Generate the questions with full mark schemes.'
    : 'Generate the questions. Omit detailed mark schemes — provide only brief answer notes.'

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey })

  try {
    const aiRes = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = aiRes.content[0]?.type === 'text' ? aiRes.content[0].text : ''

    let questions: unknown[]
    try {
      questions = JSON.parse(text)
      if (!Array.isArray(questions)) throw new Error('not an array')
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
    }

    return NextResponse.json({ questions, exam_board, topic: safeTopic, difficulty: parsedDifficulty })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
