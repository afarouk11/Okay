import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY environment variable is not set.' },
      { status: 500 }
    )
  }

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
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
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

    // Parse QUESTION and SOLUTION blocks
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
