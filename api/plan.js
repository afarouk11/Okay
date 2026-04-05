/**
 * POST /api/plan — AI-powered daily study plan generator.
 *
 * Fetches the authenticated user's learning data (weak topics, SM-2 review
 * queue, profile) and asks Claude to generate a personalised, time-boxed
 * study plan for today.
 *
 * Request body:
 *   time_available  {number}  Minutes available for study today (15–480, default 60)
 *   focus           {string}  Optional topic/area to prioritise (max 120 chars)
 *   save_tasks      {boolean} If true, persist plan sessions as tasks in DB
 *
 * Response:
 *   { plan: { date, time_available, sessions: [{topic, duration_min, type, why}] } }
 *
 * Demo mode (no Supabase): returns a static example plan.
 */

import { applyHeaders, isRateLimited, getIp, fetchWithRetry } from './_lib.js';
import { createClient } from '@supabase/supabase-js';

const MAX_FOCUS_LENGTH = 120;

let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
} catch (_) {}

// ─── Demo plan (returned when Supabase is not configured) ────────────────────

function buildDemoPlan(timeMin) {
  return {
    sessions: [
      { topic: 'Differentiation', duration_min: Math.round(timeMin * 0.35), type: 'Study', why: 'Core calculus skill used across all A-Level Maths modules' },
      { topic: 'Integration', duration_min: Math.round(timeMin * 0.30), type: 'Practice', why: 'Complement to differentiation; frequently tested in exams' },
      { topic: 'Trigonometry', duration_min: Math.round(timeMin * 0.25), type: 'Revision', why: 'Due for spaced-repetition review' },
      { topic: 'Break', duration_min: Math.round(timeMin * 0.10), type: 'Break', why: 'Short rest helps consolidate memory' }
    ]
  };
}

// ─── Plan prompt builder ─────────────────────────────────────────────────────

function buildPlanPrompt(profile, weakTopics, dueTopics, timeMin, focus) {
  const lines = [
    'Generate a personalised study plan for today. Respond with valid JSON only — no prose, no markdown code fences.',
    '',
    '## Student profile',
    profile.name        ? `Name: ${profile.name}` : null,
    profile.year_group  ? `Year group: ${profile.year_group}` : null,
    profile.exam_board  ? `Exam board: ${profile.exam_board}` : null,
    profile.target_grade ? `Target grade: ${profile.target_grade}` : null,
    `Time available today: ${timeMin} minutes`,
    focus               ? `Priority focus: ${focus}` : null,
    '',
    weakTopics.length
      ? `## Weak topics (low accuracy — prioritise these)\n${weakTopics.map(t => `- ${t.topic}: ${t.accuracy}% accuracy, mastery ${t.mastery}/5`).join('\n')}`
      : null,
    dueTopics.length
      ? `## Topics due for spaced-repetition review\n${dueTopics.map(t => `- ${t}`).join('\n')}`
      : null,
    '',
    '## Required JSON format',
    '```',
    '{',
    '  "sessions": [',
    '    {',
    '      "topic": "<topic name>",',
    '      "duration_min": <integer minutes>,',
    '      "type": "<Study | Practice | Revision | Break>",',
    '      "why": "<one sentence explaining why this is in the plan>"',
    '    }',
    '  ]',
    '}',
    '```',
    '',
    `Rules:
- Total of all duration_min values must equal exactly ${timeMin} minutes.
- Include at least one Break session (5–10 min) for plans over 45 minutes.
- Order sessions: hardest/weakest topics first, revision in the middle, break last.
- Include 3–6 sessions maximum.
- If the student has weak topics or due reviews, they must appear in the plan.
- Be specific with topic names (e.g. "Integration by parts" not "Integration").`
  ];

  return lines.filter(l => l !== null).join('\n');
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  applyHeaders(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIp(req);
  if (isRateLimited(`${ip}:plan`, 10, 60_000)) {
    return res.status(429).json({ error: 'Too many requests — please try again later' });
  }

  // ── Input validation ──────────────────────────────────────────────────────
  const { time_available, focus, save_tasks } = req.body || {};

  const rawTime = Number(time_available);
  const timeMin = Number.isFinite(rawTime) && rawTime > 0
    ? Math.min(Math.max(Math.round(rawTime), 15), 480)
    : 60;

  if (focus !== undefined && focus !== null) {
    if (typeof focus !== 'string') {
      return res.status(400).json({ error: 'focus must be a string' });
    }
    if (focus.length > MAX_FOCUS_LENGTH) {
      return res.status(400).json({ error: `focus must not exceed ${MAX_FOCUS_LENGTH} characters` });
    }
  }

  const today = new Date().toISOString().split('T')[0];

  // ── Demo mode ─────────────────────────────────────────────────────────────
  if (!supabase) {
    return res.status(200).json({
      plan: { ...buildDemoPlan(timeMin), date: today, time_available: timeMin }
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured. Add it to your Vercel environment variables.' });
  }

  // ── Authenticate ──────────────────────────────────────────────────────────
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

  // ── Fetch learning data (parallel) ───────────────────────────────────────
  const [profileRes, weakRes, reviewRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('name, year_group, exam_board, target_grade')
      .eq('id', user.id)
      .single(),
    supabase
      .from('topic_mastery')
      .select('topic, mastery_level, correct_attempts, total_attempts')
      .eq('user_id', user.id)
      .lt('mastery_level', 3)
      .order('mastery_level', { ascending: true })
      .limit(5),
    supabase
      .from('topic_mastery')
      .select('topic')
      .eq('user_id', user.id)
      .lte('next_review_date', today)
      .gt('repetitions', 0)
      .limit(3)
  ]);

  const profile = profileRes.data || {};
  const weakTopics = (weakRes.data || []).map(t => ({
    topic: t.topic,
    accuracy: t.total_attempts > 0
      ? Math.round((t.correct_attempts / t.total_attempts) * 100)
      : 0,
    mastery: t.mastery_level
  }));
  const dueTopics = (reviewRes.data || []).map(t => t.topic);

  // ── Call Claude ───────────────────────────────────────────────────────────
  let claudeRes;
  try {
    claudeRes = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: 'You are Jarvis, an expert AI study planner for A-Level Maths students. Always respond with valid JSON only — no prose before or after. Do not use markdown code fences.',
        messages: [
          { role: 'user', content: buildPlanPrompt(profile, weakTopics, dueTopics, timeMin, focus || null) }
        ]
      })
    });
  } catch (_) {
    return res.status(500).json({ error: 'Failed to connect to AI service. Please try again.' });
  }

  const claudeData = await claudeRes.json();
  if (!claudeRes.ok) {
    return res.status(502).json({ error: 'AI service returned an error. Please try again.' });
  }

  // ── Parse plan from Claude response ──────────────────────────────────────
  const rawText = claudeData.content?.[0]?.text || '{}';
  let plan;
  try {
    plan = JSON.parse(rawText);
  } catch (_) {
    // If Claude wrapped JSON in markdown fences, strip them and retry
    const match = rawText.match(/\{[\s\S]*\}/);
    try {
      plan = match ? JSON.parse(match[0]) : { sessions: [] };
    } catch (_2) {
      plan = { sessions: [] };
    }
  }

  if (!Array.isArray(plan.sessions)) plan.sessions = [];

  // ── Optionally persist as tasks ───────────────────────────────────────────
  if (save_tasks && plan.sessions.length > 0) {
    const taskRows = plan.sessions
      .filter(s => s.type !== 'Break')
      .map(s => ({
        user_id:     user.id,
        title:       `${s.type || 'Study'}: ${s.topic} (${s.duration_min} min)`,
        description: s.why || null,
        due_date:    today,
        done:        false
      }));
    if (taskRows.length > 0) {
      await supabase.from('tasks').insert(taskRows).then(null, () => {});
    }
  }

  return res.status(200).json({
    plan: { ...plan, date: today, time_available: timeMin }
  });
}
