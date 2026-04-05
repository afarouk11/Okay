import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { isRateLimited, getIp } from '@/lib/rateLimit';

const TRIAL_DAILY_LIMIT = 20;

type Message = { role: 'user' | 'assistant'; content: string };

async function buildAdaptiveSystemPrompt(
  userId: string,
  baseSystem: string | undefined,
  profile: Record<string, unknown> | null
): Promise<string> {
  const supabase = createServerSupabase();
  if (!supabase || !profile) return baseSystem ?? '';

  const today = new Date().toISOString().split('T')[0];
  try {
    const [weakRes, reviewRes] = await Promise.all([
      supabase.from('topic_mastery')
        .select('topic, mastery_level, correct_attempts, total_attempts')
        .eq('user_id', userId).lt('mastery_level', 3)
        .order('mastery_level', { ascending: true }).limit(5),
      supabase.from('topic_mastery')
        .select('topic').eq('user_id', userId)
        .lte('next_review_date', today).gt('repetitions', 0).limit(3),
    ]);

    const p = profile as {
      year_group?: string; exam_board?: string; target_grade?: string;
      adhd_mode?: boolean; dyslexia_mode?: boolean; dyscalculia_mode?: boolean;
      learning_profile?: { explanation_depth?: string; needs_scaffolding?: boolean };
    };
    const lp = p.learning_profile ?? {};

    const a11y: string[] = [];
    if (p.adhd_mode) a11y.push('ADHD: keep responses focused and concise; use bullet points; chunk into short steps.');
    if (p.dyslexia_mode) a11y.push('Dyslexia: use clear headings; short sentences; prefer numbered lists.');
    if (p.dyscalculia_mode) a11y.push('Dyscalculia: colour-code each step; use visual analogies for numbers.');

    const weakTopics = (weakRes.data ?? []).map(t => {
      const acc = (t as { total_attempts: number; correct_attempts: number }).total_attempts > 0
        ? Math.round(((t as { correct_attempts: number }).correct_attempts / (t as { total_attempts: number }).total_attempts) * 100) : 0;
      return `${(t as { topic: string }).topic} (${acc}% accuracy, mastery ${(t as { mastery_level: number }).mastery_level}/5)`;
    });
    const dueTopics = (reviewRes.data ?? []).map(t => (t as { topic: string }).topic);

    const depthNote = lp.explanation_depth === 'brief'
      ? 'This student grasps concepts quickly — be concise.'
      : lp.needs_scaffolding
        ? 'This student needs careful scaffolding — break every solution into small labelled steps.'
        : 'Provide clear, structured explanations with worked examples.';

    const lines = [
      '[STUDENT CONTEXT]',
      p.year_group    ? `Year group: ${p.year_group}` : null,
      p.exam_board    ? `Exam board: ${p.exam_board}` : null,
      p.target_grade  ? `Target grade: ${p.target_grade}` : null,
      a11y.length     ? `Accessibility:\n  • ${a11y.join('\n  • ')}` : null,
      weakTopics.length ? `Weak topics: ${weakTopics.join(', ')}` : null,
      dueTopics.length  ? `Due for review: ${dueTopics.join(', ')}` : null,
      depthNote,
      '[/STUDENT CONTEXT]',
    ].filter(Boolean).join('\n');

    return baseSystem ? `${lines}\n\n${baseSystem}` : lines;
  } catch (_) {
    return baseSystem ?? '';
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

  const ip = getIp(req);
  if (isRateLimited(`${ip}:chat`, 30, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const { model, messages, max_tokens, system } = body as {
    model?: string; messages?: Message[]; max_tokens?: number; system?: string;
  };

  if (!messages || !Array.isArray(messages))
    return NextResponse.json({ error: 'messages array required' }, { status: 400 });
  if (messages.length > 50)
    return NextResponse.json({ error: 'Too many messages' }, { status: 400 });
  if (JSON.stringify(messages).length > 100_000)
    return NextResponse.json({ error: 'Message content too long' }, { status: 400 });

  const supabase = createServerSupabase();
  let userId: string | null = null;
  let isPaid = false;
  let cachedProfile: Record<string, unknown> | null = null;

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (token && !token.startsWith('demo_token_') && supabase) {
    const { data: { user } } = await supabase.auth.getUser(token).catch(() => ({ data: { user: null } }));
    if (user) {
      userId = user.id;
      const { data: profile } = await supabase.from('profiles')
        .select('subscription_status,trial_messages_today,trial_messages_reset_date,year_group,exam_board,target_grade,adhd_mode,dyslexia_mode,dyscalculia_mode,learning_profile')
        .eq('id', user.id).single();
      cachedProfile = profile;
      isPaid = (profile as { subscription_status?: string } | null)?.subscription_status === 'active';
    }
  }

  if (userId && !isPaid && cachedProfile && supabase) {
    const today = new Date().toISOString().slice(0, 10);
    const p = cachedProfile as { trial_messages_today?: number; trial_messages_reset_date?: string };
    const resetDate = p.trial_messages_reset_date;
    const count = resetDate === today ? (p.trial_messages_today ?? 0) : 0;
    if (count >= TRIAL_DAILY_LIMIT)
      return NextResponse.json({ error: `Daily limit of ${TRIAL_DAILY_LIMIT} reached. Upgrade to continue.`, code: 'daily_limit_exceeded' }, { status: 429 });
    supabase.from('profiles').update({ trial_messages_today: count + 1, trial_messages_reset_date: today })
      .eq('id', userId).then(null, () => {});
  }

  const effectiveSystem = userId
    ? await buildAdaptiveSystemPrompt(userId, system, cachedProfile)
    : system;

  try {
    const anthropicBody: Record<string, unknown> = {
      model: model ?? 'claude-sonnet-4-6',
      messages,
      max_tokens: max_tokens ?? 1500,
    };
    if (effectiveSystem) anthropicBody.system = effectiveSystem;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicBody),
    });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (_) {
    return NextResponse.json({ error: 'Failed to connect to AI service' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
