import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { isRateLimited, getIp } from '@/lib/rateLimit';

const MAX_FOCUS_LENGTH = 120;

interface WeakTopic { topic: string; accuracy: number; mastery: number }

function buildDemoPlan(timeMin: number) {
  return {
    sessions: [
      { topic: 'Differentiation', duration_min: Math.round(timeMin * 0.35), type: 'Study', why: 'Core calculus skill' },
      { topic: 'Integration', duration_min: Math.round(timeMin * 0.30), type: 'Practice', why: 'Complements differentiation' },
      { topic: 'Trigonometry', duration_min: Math.round(timeMin * 0.25), type: 'Revision', why: 'Due for review' },
      { topic: 'Break', duration_min: Math.round(timeMin * 0.10), type: 'Break', why: 'Rest helps consolidate memory' },
    ],
  };
}

function buildPlanPrompt(
  profile: Record<string, string | undefined>,
  weakTopics: WeakTopic[],
  dueTopics: string[],
  timeMin: number,
  focus: string | null
): string {
  const lines = [
    'Generate a personalised study plan for today. Respond with valid JSON only.',
    '',
    `Time available: ${timeMin} minutes`,
    focus ? `Priority focus: ${focus}` : null,
    profile.year_group  ? `Year group: ${profile.year_group}` : null,
    profile.exam_board  ? `Exam board: ${profile.exam_board}` : null,
    profile.target_grade ? `Target grade: ${profile.target_grade}` : null,
    weakTopics.length ? `\nWeak topics:\n${weakTopics.map(t => `- ${t.topic}: ${t.accuracy}% accuracy, mastery ${t.mastery}/5`).join('\n')}` : null,
    dueTopics.length  ? `\nDue for spaced-repetition review:\n${dueTopics.map(t => `- ${t}`).join('\n')}` : null,
    `\nRespond with: { "sessions": [ { "topic": "...", "duration_min": N, "type": "Study|Practice|Revision|Break", "why": "..." } ] }`,
    `Rules: total duration_min must equal ${timeMin}. Include a Break for plans >45 min. 3–6 sessions. Hardest topics first.`,
  ];
  return lines.filter(Boolean).join('\n');
}

async function getUser(req: NextRequest) {
  const supabase = createServerSupabase();
  if (!supabase) return null;
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

  const ip = getIp(req);
  if (isRateLimited(`${ip}:plan`, 10, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const body = await req.json().catch(() => ({})) as {
    time_available?: number; focus?: string; save_tasks?: boolean;
  };
  const rawTime = Number(body.time_available);
  const timeMin = Number.isFinite(rawTime) && rawTime > 0
    ? Math.min(Math.max(Math.round(rawTime), 15), 480) : 60;

  if (body.focus !== undefined && body.focus !== null) {
    if (typeof body.focus !== 'string') return NextResponse.json({ error: 'focus must be a string' }, { status: 400 });
    if (body.focus.length > MAX_FOCUS_LENGTH) return NextResponse.json({ error: `focus must not exceed ${MAX_FOCUS_LENGTH} characters` }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];
  const supabase = createServerSupabase();

  if (!supabase) {
    return NextResponse.json({ plan: { ...buildDemoPlan(timeMin), date: today, time_available: timeMin } });
  }

  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [profileRes, weakRes, reviewRes] = await Promise.all([
    supabase.from('profiles').select('name,year_group,exam_board,target_grade').eq('id', user.id).single(),
    supabase.from('topic_mastery').select('topic,mastery_level,correct_attempts,total_attempts')
      .eq('user_id', user.id).lt('mastery_level', 3).order('mastery_level', { ascending: true }).limit(5),
    supabase.from('topic_mastery').select('topic').eq('user_id', user.id)
      .lte('next_review_date', today).gt('repetitions', 0).limit(3),
  ]);

  const profile = (profileRes.data ?? {}) as Record<string, string | undefined>;
  const weakTopics: WeakTopic[] = (weakRes.data ?? []).map((t: Record<string, unknown>) => ({
    topic: t.topic as string,
    accuracy: (t.total_attempts as number) > 0 ? Math.round(((t.correct_attempts as number) / (t.total_attempts as number)) * 100) : 0,
    mastery: t.mastery_level as number,
  }));
  const dueTopics = (reviewRes.data ?? []).map((t: Record<string, unknown>) => t.topic as string);

  let claudeRes: Response;
  try {
    claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: 'You are Jarvis, an expert AI study planner. Respond with valid JSON only. No prose. No markdown code fences.',
        messages: [{ role: 'user', content: buildPlanPrompt(profile, weakTopics, dueTopics, timeMin, body.focus ?? null) }],
      }),
    });
  } catch (_) {
    return NextResponse.json({ error: 'Failed to connect to AI service' }, { status: 500 });
  }

  const claudeData = await claudeRes.json() as { content?: Array<{ text: string }> };
  if (!claudeRes.ok) return NextResponse.json({ error: 'AI service error' }, { status: 502 });

  const rawText = claudeData.content?.[0]?.text ?? '{}';
  let plan: { sessions?: unknown[] };
  try { plan = JSON.parse(rawText); }
  catch (_) {
    const match = rawText.match(/\{[\s\S]*\}/);
    try { plan = match ? JSON.parse(match[0]) : { sessions: [] }; }
    catch (_2) { plan = { sessions: [] }; }
  }
  if (!Array.isArray(plan.sessions)) plan.sessions = [];

  if (body.save_tasks && plan.sessions.length > 0) {
    const taskRows = (plan.sessions as Array<{ type?: string; topic?: string; duration_min?: number; why?: string }>)
      .filter(s => s.type !== 'Break')
      .map(s => ({ user_id: user.id, title: `${s.type ?? 'Study'}: ${s.topic} (${s.duration_min} min)`, description: s.why ?? null, due_date: today, done: false }));
    if (taskRows.length > 0) await supabase.from('tasks').insert(taskRows).then(null, () => {});
  }

  return NextResponse.json({ plan: { ...plan, date: today, time_available: timeMin } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
