import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { isRateLimited, getIp, fetchWithRetry } from '@/lib/rateLimit'

const VOICE_IDS: Record<string, string> = {
  jarvis:    'JBFqnCBsd6RMkjVDRZzb',
  alice:     'Xb7hH8MSUJpSbSDYk0k2',
  charlotte: 'XB0fDUnXU5powFXDhCwa',
  dorothy:   'ThT5KcBeYPX3keUQqHPh',
  daniel:    'onwK4e9ZLuTAKqWW03F9',
}

const VOICE_SETTINGS: Record<string, object> = {
  jarvis:  { stability: 0.48, similarity_boost: 0.82, style: 0.18, use_speaker_boost: true },
  alice:   { stability: 0.55, similarity_boost: 0.80, style: 0.12, use_speaker_boost: true },
  default: { stability: 0.50, similarity_boost: 0.75 },
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

// GET — return ElevenLabs agent config / conversation token
export async function GET(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:jarvis-config`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user } = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agentId = process.env.ELEVEN_AGENT_ID || 'agent_4101kn5cm6t2efwsasfhx8cgh1r3'
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ agentId })

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { 'xi-api-key': apiKey } },
    )
    if (!res.ok) return NextResponse.json({ agentId })
    const { token } = await res.json()
    return NextResponse.json({ conversationToken: token })
  } catch {
    return NextResponse.json({ agentId })
  }
}

// POST — text-to-speech stream
export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'TTS not configured' }, { status: 503 })

  const ip = getIp(request)
  if (isRateLimited(`${ip}:tts`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user } = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { text?: string; voice?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { text, voice = 'alice' } = body
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const voiceId = VOICE_IDS[voice] ?? VOICE_IDS.alice
  const settings = VOICE_SETTINGS[voice] ?? VOICE_SETTINGS.default
  const input = text.slice(0, 5000)

  let upstream: Response
  try {
    upstream = await fetchWithRetry(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: input,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: settings,
        }),
      },
    )
  } catch {
    return NextResponse.json({ error: 'TTS service unavailable' }, { status: 503 })
  }

  if (!upstream.ok) {
    const err = await upstream.text()
    return NextResponse.json({ error: err }, { status: upstream.status })
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  })
}
