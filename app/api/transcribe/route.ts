import { NextRequest, NextResponse } from 'next/server'
import { isRateLimited, getIp, fetchWithRetry } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Transcription not configured' }, { status: 503 })

  const ip = getIp(request)
  if (isRateLimited(`${ip}:transcribe`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: ArrayBuffer
  try {
    body = await request.arrayBuffer()
  } catch {
    return NextResponse.json({ error: 'Failed to read audio data' }, { status: 400 })
  }

  if (!body || body.byteLength === 0) {
    return NextResponse.json({ error: 'Audio data is required' }, { status: 400 })
  }

  const contentType = request.headers.get('content-type') || 'audio/webm'

  let upstream: Response
  try {
    upstream = await fetchWithRetry(
      'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': contentType,
        },
        body,
      },
    )
  } catch {
    return NextResponse.json({ error: 'Transcription service unavailable' }, { status: 503 })
  }

  if (!upstream.ok) {
    const err = await upstream.text()
    return NextResponse.json({ error: err }, { status: upstream.status })
  }

  const data = await upstream.json()
  const transcript: string = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''

  if (!transcript) {
    return NextResponse.json({ error: 'Could not transcribe audio' }, { status: 422 })
  }

  return NextResponse.json({ transcript })
}
