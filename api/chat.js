import { applyHeaders, isRateLimited, getIp } from './_lib.js';
import { createClient } from '@supabase/supabase-js';

const TRIAL_DAILY_LIMIT = 20;

// Supabase client (service role) — used only for per-user rate limit checks
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
} catch (_) {}

/**
 * Fetch student-specific context and prepend it to the caller's system prompt.
 * Makes every Claude response personalised to the individual student.
 *
 * Fetches in parallel:
 *   1. Profile (accessibility modes, exam board, target grade, learning_profile)
 *   2. Weak topics (mastery_level < 3, up to 5)
 *   3. Review queue (topics due today, up to 3)
 *
 * Scientific frameworks applied:
 *   • Cognitive Load Theory  — accessibility-aware language instructions
 *   • Mastery Learning       — tutor knows which foundations need reinforcing
 *   • Spaced Repetition cues — tutor can surface due topics organically
 *
 * @param {string} userId
 * @param {string|undefined} baseSystem  Caller-supplied system prompt
 * @returns {Promise<string>}
 */
async function buildAdaptiveSystemPrompt(userId, baseSystem) {
  if (!supabase) return baseSystem || '';

  const today = new Date().toISOString().split('T')[0];

  try {
    const [profileRes, weakRes, reviewRes] = await Promise.all([
      supabase.from('profiles')
        .select('year_group, exam_board, target_grade, adhd_mode, dyslexia_mode, dyscalculia_mode, learning_profile')
        .eq('id', userId).single(),
      supabase.from('topic_mastery')
        .select('topic, mastery_level, correct_attempts, total_attempts')
        .eq('user_id', userId)
        .lt('mastery_level', 3)
        .order('mastery_level', { ascending: true })
        .limit(5),
      supabase.from('topic_mastery')
        .select('topic')
        .eq('user_id', userId)
        .lte('next_review_date', today)
        .gt('repetitions', 0)
        .limit(3)
    ]);

    const p = profileRes.data;
    if (!p) return baseSystem || '';

    const lp = p.learning_profile || {};

    // ── Accessibility instructions ──
    const a11y = [];
    if (p.adhd_mode)        a11y.push('ADHD: keep responses focused and concise; use bullet points; avoid dense paragraphs; chunk information into short steps.');
    if (p.dyslexia_mode)    a11y.push('Dyslexia: use clear headings; short sentences; avoid italics; prefer numbered lists over flowing prose.');
    if (p.dyscalculia_mode) a11y.push('Dyscalculia: colour-code each working step in your description; use visual analogies for numbers; number every calculation step explicitly.');

    // ── Weak topic summary ──
    const weakTopics = (weakRes.data || []).map(t => {
      const acc = t.total_attempts > 0
        ? Math.round((t.correct_attempts / t.total_attempts) * 100)
        : 0;
      return `${t.topic} (${acc}% accuracy, mastery ${t.mastery_level}/5)`;
    });

    // ── Review queue ──
    const dueTopics = (reviewRes.data || []).map(t => t.topic);

    // ── Learning pace / depth ──
    const depthNote = lp.explanation_depth === 'brief'
      ? 'This student grasps concepts quickly — be concise and skip over-explanation.'
      : lp.needs_scaffolding
        ? 'This student needs careful scaffolding — break every solution into small, labelled steps before moving on.'
        : 'Provide clear, structured explanations with worked examples.';

    // ── Assemble context block ──
    const lines = [
      '[STUDENT CONTEXT — use this to personalise your response]',
      p.year_group   ? `Year group: ${p.year_group}` : null,
      p.exam_board   ? `Exam board: ${p.exam_board}` : null,
      p.target_grade ? `Target grade: ${p.target_grade}` : null,
      a11y.length    ? `Accessibility needs:\n  • ${a11y.join('\n  • ')}` : null,
      weakTopics.length ? `Topics needing extra support: ${weakTopics.join(', ')}` : null,
      dueTopics.length  ? `Topics due for review today (mention if relevant): ${dueTopics.join(', ')}` : null,
      depthNote,
      '[/STUDENT CONTEXT]'
    ].filter(Boolean).join('\n');

    return baseSystem ? `${lines}\n\n${baseSystem}` : lines;
  } catch (_) {
    // Non-fatal: fall back to base system prompt
    return baseSystem || '';
  }
}

export default async function handler(req, res) {
  applyHeaders(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIp(req);
  // IP-level throttle (30 req/min) — protects against unauthenticated abuse
  if (isRateLimited(`${ip}:chat`, 30, 60_000)) {
    return res.status(429).json({ error: 'Too many requests — please try again later' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured. Add it to your Vercel environment variables.' });

  // ── Per-user auth & rate limiting ──────────────────────────────────────────
  let userId = null;
  let isPaidUser = false;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ') && supabase) {
    const token = authHeader.slice(7);
    if (!token.startsWith('demo_token_')) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('id', user.id)
            .single();
          isPaidUser = profile?.subscription_status === 'active';
          // userId already set above — used later for adaptive prompt
        }
      } catch (_) {}
    }
  }

  // Per-user daily cap: trial/free users → 20 calls/day
  if (userId && !isPaidUser) {
    const dayKey = `user:${userId}:chat:${new Date().toISOString().slice(0, 10)}`;
    if (isRateLimited(dayKey, TRIAL_DAILY_LIMIT, 24 * 60 * 60_000)) {
      return res.status(429).json({
        error: `You've reached your daily limit of ${TRIAL_DAILY_LIMIT} AI messages. Upgrade to continue.`,
        code: 'daily_limit_exceeded'
      });
    }
  }

  // ── Validate request body ─────────────────────────────────────────────────
  const { model, messages, max_tokens, system } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request: messages array required' });
  }
  if (messages.length > 50) {
    return res.status(400).json({ error: 'Too many messages. Please start a new conversation.' });
  }
  if (JSON.stringify(messages).length > 100000) {
    return res.status(400).json({ error: 'Message content too long. Please shorten your request.' });
  }

  // ── Build adaptive system prompt (enriched with student context) ─────────
  let effectiveSystem = system;
  if (userId) {
    // Authenticated user: personalise the system prompt with their learning data
    effectiveSystem = await buildAdaptiveSystemPrompt(userId, system);
  }

  // ── Call Anthropic ────────────────────────────────────────────────────────
  try {
    const body = { model: model || 'claude-sonnet-4-6', messages, max_tokens: max_tokens || 1500 };
    if (effectiveSystem) body.system = effectiveSystem;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to connect to AI service. Please try again.' });
  }
}
