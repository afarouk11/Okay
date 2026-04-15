import { NextRequest, NextResponse } from 'next/server'

import { CLAUDE_HAIKU_MODEL } from '@/lib/aiModels'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getMode(request: NextRequest, body: Record<string, unknown>) {
  const { searchParams } = new URL(request.url)
  return String(searchParams.get('mode') || body.mode || '').toLowerCase().trim()
}

async function generateGcse(req: NextRequest) {
  let body: { topic: string; tier: string; marks: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { topic, tier, marks } = body

  const systemPrompt = `You are an expert GCSE Maths examiner with 20 years of experience creating exam questions for AQA, Edexcel, and OCR.
You produce clear, accurate, and appropriately challenging questions that match real exam style and mark schemes.
Always format your response exactly as:
QUESTION:
[The full question here, with any necessary context, data, or diagrams described in text]

SOLUTION:
[Step-by-step working out, clearly showing method marks, followed by the final answer]`

  const userPrompt = `Generate a ${tier} tier GCSE Maths question on the topic of ${topic} worth ${marks} marks.
The question should be appropriate for a student aged 14-16 and match the style of real GCSE exam questions.
For ${marks} marks questions, ensure the difficulty and length of working matches the mark allocation.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_HAIKU_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', errText)
      return NextResponse.json({ error: 'Failed to fetch from Anthropic API.' }, { status: 500 })
    }

    const data = await response.json()
    const rawText: string = data.content?.[0]?.text ?? ''

    const questionMatch = rawText.match(/QUESTION:\s*([\s\S]*?)(?=\n\nSOLUTION:|$)/i)
    const solutionMatch = rawText.match(/SOLUTION:\s*([\s\S]*?)$/i)

    const question = questionMatch ? questionMatch[1].trim() : rawText.trim()
    const solution = solutionMatch ? solutionMatch[1].trim() : ''

    return NextResponse.json({ question, solution })
  } catch (err) {
    console.error('generate-gcse error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

async function generateIq(req: NextRequest) {
  let body: { exerciseType: string; difficulty: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { exerciseType, difficulty } = body

  const systemPrompt = `You are an expert cognitive assessment designer specialising in IQ-style exercises for adults.
You create diverse, well-calibrated multiple-choice questions that test reasoning ability.
You MUST respond with ONLY a valid JSON array — no markdown, no code fences, no explanation text outside the JSON.`

  const userPrompt = `Generate exactly 8 IQ-style multiple choice exercises of type "${exerciseType}" at "${difficulty}" difficulty level.

Return a JSON array of exactly 8 objects. Each object must have this exact shape:
{
  "type": string,
  "question": string,
  "options": [string, string, string, string],
  "answer": "A" | "B" | "C" | "D",
  "explanation": string
}

The options array must have exactly 4 items. The answer field must be exactly "A", "B", "C", or "D" corresponding to options[0], options[1], options[2], options[3] respectively.
Make questions genuinely challenging but solvable. Vary the difficulty within the set.
For pattern sequences: describe sequences with words or numbers.
For verbal analogies: use clear WORD : WORD :: WORD : ? format.
For spatial reasoning: describe the shapes/transformations in text.
For logic puzzles: provide clear premises and a deducible conclusion.
For number series: provide a clear numeric sequence.

Return ONLY the JSON array, nothing else.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_HAIKU_MODEL,
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', errText)
      return NextResponse.json({ error: 'Failed to fetch from Anthropic API.' }, { status: 500 })
    }

    const data = await response.json()
    const rawText: string = data.content?.[0]?.text ?? ''

    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    let questions: unknown[]
    try {
      questions = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse IQ questions JSON:', cleaned)
      return NextResponse.json({ error: 'AI returned malformed JSON. Please try again.' }, { status: 500 })
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'AI returned invalid question format. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ questions })
  } catch (err) {
    console.error('generate-iq error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY environment variable is not set.' }, { status: 500 })
  }

  const body = await request.clone().json().catch(() => ({} as Record<string, unknown>))
  const mode = getMode(request, body)

  if (mode === 'gcse') return generateGcse(request)
  if (mode === 'iq') return generateIq(request)

  return NextResponse.json({ error: 'Unknown generate mode' }, { status: 400 })
}
