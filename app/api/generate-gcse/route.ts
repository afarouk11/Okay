import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  let body: { topic?: string; tier?: string; marks?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const { topic = 'mixed', tier = 'foundation', marks = '3-4' } = body

  const system = `You are an expert GCSE Maths examiner (AQA/Edexcel style).
Format your response EXACTLY as:
QUESTION:
[full question text]

SOLUTION:
[step-by-step worked solution with every mark-worthy step]`

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: `Generate a ${tier} tier GCSE Maths question on ${topic} worth ${marks} marks.` }],
      }),
    })
    const data = await r.json()
    const raw: string = data.content?.[0]?.text ?? ''
    const qMatch = raw.match(/QUESTION:\s*([\s\S]*?)(?=\n\nSOLUTION:|$)/i)
    const sMatch = raw.match(/SOLUTION:\s*([\s\S]*?)$/i)
    return NextResponse.json({
      question: qMatch ? qMatch[1].trim() : raw.trim(),
      solution: sMatch ? sMatch[1].trim() : '',
    })
  } catch {
    return NextResponse.json({ error: 'Failed to connect to AI service' }, { status: 500 })
  }
}
