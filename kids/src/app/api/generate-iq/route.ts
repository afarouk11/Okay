import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY environment variable is not set.' },
      { status: 500 }
    )
  }

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
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', errText)
      return NextResponse.json(
        { error: 'Failed to fetch from Anthropic API.' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const rawText: string = data.content?.[0]?.text ?? ''

    // Strip any potential markdown code fences
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    let questions: unknown[]
    try {
      questions = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse IQ questions JSON:', cleaned)
      return NextResponse.json(
        { error: 'AI returned malformed JSON. Please try again.' },
        { status: 500 }
      )
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'AI returned invalid question format. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ questions })
  } catch (err) {
    console.error('generate-iq error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
