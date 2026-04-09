import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { isRateLimited, getIp } from '@/lib/rateLimit'

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getUser(request: NextRequest) {
  const supabase = createServiceClient()
  if (!supabase) return { user: null }
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { user: null }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { user: null }
  return { user }
}

// ── POST — WebRTC signaling proxy ─────────────────────────────────────────────
//
// Accepts our SDP offer and forwards it to ElevenLabs Conversational AI.
// Returns the SDP answer so the client can complete the WebRTC handshake.
//
// ElevenLabs endpoint:
//   POST https://api.elevenlabs.io/v1/convai/conversation?token=<signed_token>
//   Content-Type: application/sdp
//   Body: SDP offer string
//   Response: SDP answer string

export async function POST(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:voice-session`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user } = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { sdp?: string; conversationToken?: string; agentId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { sdp, conversationToken, agentId } = body

  if (!sdp || typeof sdp !== 'string') {
    return NextResponse.json({ error: 'sdp is required' }, { status: 400 })
  }

  if (!conversationToken && !agentId) {
    return NextResponse.json({ error: 'conversationToken or agentId is required' }, { status: 400 })
  }

  // Build signaling URL — prefer signed token (no server-side API key exposure)
  const signalingUrl = conversationToken
    ? `https://api.elevenlabs.io/v1/convai/conversation?token=${encodeURIComponent(conversationToken)}`
    : `https://api.elevenlabs.io/v1/convai/conversation?agent_id=${encodeURIComponent(agentId!)}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/sdp',
  }

  // Only attach server-side API key when using agentId (unsigned fallback path)
  if (!conversationToken && process.env.ELEVENLABS_API_KEY) {
    headers['xi-api-key'] = process.env.ELEVENLABS_API_KEY
  }

  let upstream: Response
  try {
    upstream = await fetch(signalingUrl, {
      method: 'POST',
      headers,
      body: sdp,
    })
  } catch {
    return NextResponse.json({ error: 'ElevenLabs signaling unreachable' }, { status: 502 })
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '')
    return NextResponse.json({ error: errText || 'Signaling failed' }, { status: upstream.status })
  }

  const answerSdp = await upstream.text()
  return NextResponse.json({ sdp: answerSdp })
}
