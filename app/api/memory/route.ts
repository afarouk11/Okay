import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { isRateLimited, getIp } from '@/lib/rateLimit';

const MAX_ERRORS_LENGTH    = 20;
const MAX_ERROR_STR_LENGTH = 200;
const MAX_TOPIC_LENGTH     = 100;
const MAX_LIMIT            = 20;

async function getUser(req: NextRequest) {
  const supabase = createServerSupabase();
  if (!supabase) return null;
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const ip = getIp(req);
  if (isRateLimited(`${ip}:memory`, 60, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ sessions: [] });

  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rawLimit = parseInt(new URL(req.url).searchParams.get('limit') ?? '5', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT) : 5;

  const { data, error } = await supabase.from('jarvis_sessions')
    .select('id,session_date,topic,mastery_score,specific_errors,duration_ms')
    .eq('user_id', user.id).order('session_date', { ascending: false }).limit(limit);

  if (error) return NextResponse.json({ error: 'Failed to retrieve sessions' }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  if (isRateLimited(`${ip}:memory`, 60, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ success: true });

  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    topic?: string; mastery_score?: number; specific_errors?: string[]; duration_ms?: number;
  };
  const { topic, mastery_score, specific_errors, duration_ms } = body;

  if (topic !== undefined && topic !== null) {
    if (typeof topic !== 'string') return NextResponse.json({ error: 'topic must be a string' }, { status: 400 });
    if (topic.length > MAX_TOPIC_LENGTH) return NextResponse.json({ error: `topic must not exceed ${MAX_TOPIC_LENGTH} chars` }, { status: 400 });
  }
  if (mastery_score !== undefined && mastery_score !== null) {
    const n = Number(mastery_score);
    if (!Number.isFinite(n) || n < 0 || n > 1) return NextResponse.json({ error: 'mastery_score must be 0–1' }, { status: 400 });
  }
  if (specific_errors !== undefined && specific_errors !== null) {
    if (!Array.isArray(specific_errors)) return NextResponse.json({ error: 'specific_errors must be an array' }, { status: 400 });
    if (specific_errors.length > MAX_ERRORS_LENGTH) return NextResponse.json({ error: `max ${MAX_ERRORS_LENGTH} errors` }, { status: 400 });
    for (const e of specific_errors) {
      if (typeof e !== 'string') return NextResponse.json({ error: 'each error must be a string' }, { status: 400 });
      if (e.length > MAX_ERROR_STR_LENGTH) return NextResponse.json({ error: `error string max ${MAX_ERROR_STR_LENGTH} chars` }, { status: 400 });
    }
  }
  if (duration_ms !== undefined && duration_ms !== null) {
    const d = Number(duration_ms);
    if (!Number.isInteger(d) || d < 0) return NextResponse.json({ error: 'duration_ms must be non-negative integer' }, { status: 400 });
  }

  const { error } = await supabase.from('jarvis_sessions').insert({
    user_id: user.id,
    topic: typeof topic === 'string' ? topic.trim() || null : null,
    mastery_score: mastery_score != null ? Number(mastery_score) : null,
    specific_errors: Array.isArray(specific_errors) ? specific_errors : [],
    duration_ms: duration_ms != null ? Math.floor(Number(duration_ms)) : null,
  });

  if (error) return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
