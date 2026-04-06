import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  let body: { exerciseType?: string; difficulty?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const { exerciseType = 'mixed', difficulty = 'standard' } = body

  const system = `You are a neuroplasticity and cognitive training expert.
Generate brain-training exercises that build working memory, pattern recognition and cognitive flexibility.
Respond with ONLY a valid JSON array — no markdown, no code fences, no extra text.`

  const prompt = `Generate exactly 8 multiple-choice neuroplasticity exercises of type "${exerciseType}" at "${difficulty}" difficulty.
Each object: { "type": string, "question": string, "options": [string,string,string,string], "answer": "A"|"B"|"C"|"D", "explanation": string }
Return ONLY the JSON array.`

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 3000,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await r.json()
    const raw = (data.content?.[0]?.text ?? '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    let questions: unknown[]
    try { questions = JSON.parse(raw) } catch {
      return NextResponse.json({ error: 'AI returned malformed JSON — please try again' }, { status: 500 })
    }
    if (!Array.isArray(questions) || !questions.length)
      return NextResponse.json({ error: 'AI returned invalid format — please try again' }, { status: 500 })
    return NextResponse.json({ questions })
  } catch {
    return NextResponse.json({ error: 'Failed to connect to AI service' }, { status: 500 })
  }
}
