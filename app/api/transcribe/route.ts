import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { isRateLimited, getIp, fetchWithRetry } from '@/lib/rateLimit'

function normaliseAudioContentType(value: string | null): string {
  const raw = String(value || '').toLowerCase().trim()
  const base = raw.split(';')[0]?.trim() || ''

  if (!base) return 'audio/webm'
  if (base.includes('webm')) return 'audio/webm'
  if (base.includes('mp4') || base.includes('m4a') || base.includes('aac')) return 'audio/mp4'
  if (base.includes('mpeg') || base.includes('mp3')) return 'audio/mpeg'
  if (base.includes('ogg') || base.includes('opus')) return 'audio/ogg'
  return 'audio/webm'
}

function formatUpstreamError(err: string): string {
  const text = String(err || '').trim()
  if (/did not match the expected pattern|unsupported|invalid/i.test(text)) {
    return 'Unsupported audio format from the browser — please try Chrome or Edge and speak again.'
  }
  return text || 'Transcription failed — please try again.'
}

async function getUser(request: NextRequest) {
  const supabase = createServiceClient()
  if (!supabase) return { user: null }
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { user: null }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { user: null }
  return { user }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Transcription not configured' }, { status: 503 })

  const ip = getIp(request)
  if (isRateLimited(`${ip}:transcribe`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user } = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: ArrayBuffer
  try {
    body = await request.arrayBuffer()
  } catch {
    return NextResponse.json({ error: 'Failed to read audio data' }, { status: 400 })
  }

  if (!body || body.byteLength === 0) {
    return NextResponse.json({ error: 'Audio data is required' }, { status: 400 })
  }

  const contentType = normaliseAudioContentType(request.headers.get('content-type'))

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
    const err = formatUpstreamError(await upstream.text())
    return NextResponse.json({ error: err }, { status: upstream.status })
  }

  const data = await upstream.json()
  const transcript: string = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''

  if (!transcript) {
    return NextResponse.json({ error: 'Could not transcribe audio' }, { status: 422 })
  }

  return NextResponse.json({ transcript })
}
