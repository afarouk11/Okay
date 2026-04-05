import { NextRequest, NextResponse } from 'next/server';
import { isRateLimited, getIp } from '@/lib/rateLimit';

const VOICE_IDS: Record<string, string> = {
  alice:     'Xb7hH8MSUJpSbSDYk0k2',
  charlotte: 'XB0fDUnXU5powFXDhCwa',
  dorothy:   'ThT5KcBeYPX3keUQqHPh',
  daniel:    'onwK4e9ZLuTAKqWW03F9',
  jarvis:    'JBFqnCBsd6RMkjVDRZzb',
};

const VOICE_SETTINGS: Record<string, Record<string, number | boolean>> = {
  jarvis:  { stability: 0.48, similarity_boost: 0.82, style: 0.18, use_speaker_boost: true },
  alice:   { stability: 0.55, similarity_boost: 0.80, style: 0.12, use_speaker_boost: true },
  default: { stability: 0.5,  similarity_boost: 0.75 },
};

// GET is intentionally unauthenticated: the voice widget initialises before auth completes
// (guest/demo mode). Abuse is mitigated by the per-IP rate limiter below.
export async function GET(req: NextRequest) {
  const ip = getIp(req);
  if (isRateLimited(`${ip}:jarvis-config`, 10, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const agentId = process.env.ELEVEN_AGENT_ID ?? 'agent_4101kn5cm6t2efwsasfhx8cgh1r3';
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return NextResponse.json({ agentId });

  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { 'xi-api-key': apiKey } }
    );
    if (!r.ok) return NextResponse.json({ agentId });
    const { token: conversationToken } = await r.json() as { token: string };
    return NextResponse.json({ conversationToken });
  } catch (_) {
    return NextResponse.json({ agentId });
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'TTS not configured' }, { status: 503 });

  const ip = getIp(req);
  if (isRateLimited(`${ip}:tts`, 60, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const body = await req.json().catch(() => ({})) as { text?: string; voice?: string };
  const { text, voice = 'alice' } = body;
  if (!text || typeof text !== 'string')
    return NextResponse.json({ error: 'text is required' }, { status: 400 });

  const voiceId = VOICE_IDS[voice] ?? VOICE_IDS.alice;
  const voiceSettings = VOICE_SETTINGS[voice] ?? VOICE_SETTINGS.default;

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text: text.slice(0, 5000), model_id: 'eleven_turbo_v2_5', voice_settings: voiceSettings }),
      }
    );
    if (!upstream.ok) {
      const errText = await upstream.text();
      return NextResponse.json({ error: errText }, { status: upstream.status });
    }
    return new NextResponse(upstream.body, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  } catch (_) {
    return NextResponse.json({ error: 'TTS service unavailable' }, { status: 503 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
