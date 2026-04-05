/**
 * /api/adaptive  — Adaptive learning engine
 *
 * Actions (POST body: { action, ...params }):
 *
 *   analyze_gaps       → Identify topics below accuracy threshold
 *   get_review_queue   → SM-2 topics due for review today
 *   get_learning_insights → Grade prediction + study summary for dashboard
 *   update_mastery     → SM-2 update after a question is answered
 *
 * All actions require a valid Bearer token (authenticated users only).
 */

import { createClient } from '@supabase/supabase-js';
import { applyHeaders, isRateLimited, getIp } from './_lib.js';
import {
  identifyWeakTopics,
  gradeTrajectory,
  inferLearningProfile,
  zpdDifficulty
} from '../src/adaptive.js';

let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
} catch (_) {}

export default async function handler(req, res) {
  applyHeaders(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIp(req);
  if (isRateLimited(`${ip}:adaptive`, 60, 60_000)) {
    return res.status(429).json({ error: 'Too many requests — please try again later' });
  }

  // Require authentication
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  if (!supabase) {
    // Demo mode — return empty data rather than crashing
    return res.status(200).json({ demo: true, data: null });
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

  const { action } = req.body || {};

  try {
    switch (action) {
      case 'analyze_gaps':
        return handleAnalyzeGaps(res, user.id);
      case 'get_review_queue':
        return handleGetReviewQueue(res, user.id);
      case 'get_learning_insights':
        return handleGetLearningInsights(res, user.id);
      case 'update_mastery':
        return handleUpdateMastery(res, user.id, req.body);
      case 'get_session_driven_topics':
        return handleGetSessionDrivenTopics(res, user.id);
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (e) {
    console.error('[adaptive]', action, e.message);
    return res.status(500).json({ error: 'Internal error' });
  }
}

// ─── analyze_gaps ─────────────────────────────────────────────────────────────
// Queries questions answered in the last 90 days and identifies topics where
// accuracy < 65%, sorted worst-first.

async function handleAnalyzeGaps(res, userId) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: questions, error } = await supabase
    .from('questions_answered')
    .select('topic, module, is_correct')
    .eq('user_id', userId)
    .gte('created_at', since);

  if (error) return res.status(500).json({ error: error.message });

  const weakTopics = identifyWeakTopics(questions || [], 0.65);

  return res.status(200).json({ weak_topics: weakTopics });
}

// ─── get_review_queue ─────────────────────────────────────────────────────────
// Returns up to 5 topics whose SM-2 next_review_date is today or overdue.

async function handleGetReviewQueue(res, userId) {
  const today = new Date().toISOString().split('T')[0];

  const { data: due, error } = await supabase
    .from('topic_mastery')
    .select('topic, module, mastery_level, next_review_date, correct_attempts, total_attempts')
    .eq('user_id', userId)
    .lte('next_review_date', today)
    .gt('repetitions', 0)           // only topics the student has seen before
    .order('next_review_date', { ascending: true })
    .limit(5);

  if (error) return res.status(500).json({ error: error.message });

  const queue = (due || []).map(t => ({
    ...t,
    accuracy: t.total_attempts > 0
      ? Math.round((t.correct_attempts / t.total_attempts) * 100)
      : 0,
    days_overdue: Math.max(0,
      Math.floor((Date.now() - new Date(t.next_review_date).getTime()) / 86_400_000)
    ),
    suggested_difficulty: zpdDifficulty(t.mastery_level)
  }));

  return res.status(200).json({ review_queue: queue });
}

// ─── get_learning_insights ────────────────────────────────────────────────────
// Aggregates dashboard data: weak topics, review count, grade prediction,
// learning profile, and streak health.

async function handleGetLearningInsights(res, userId) {
  const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const today   = new Date().toISOString().split('T')[0];

  const [profileRes, questionsRes, reviewRes, activityRes] = await Promise.all([
    supabase.from('profiles')
      .select('target_grade, accuracy, questions_answered, streak, learning_profile')
      .eq('id', userId).single(),
    supabase.from('questions_answered')
      .select('topic, is_correct, created_at')
      .eq('user_id', userId)
      .gte('created_at', since90),
    supabase.from('topic_mastery')
      .select('topic, mastery_level')
      .eq('user_id', userId)
      .lte('next_review_date', today)
      .gt('repetitions', 0)
      .limit(5),
    supabase.from('activity_log')
      .select('questions_done')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(14)
  ]);

  const profile  = profileRes.data  || {};
  const questions = questionsRes.data || [];
  const reviewQueue = reviewRes.data  || [];

  // Compute overall accuracy from recent questions
  const totalQ   = questions.length;
  const correctQ = questions.filter(q => q.is_correct).length;
  const accuracy = totalQ > 0 ? correctQ / totalQ : (profile.accuracy || 0) / 100;

  // Average session size from activity log
  const sessions = (activityRes.data || []).filter(a => a.questions_done > 0);
  const avg_session = sessions.length > 0
    ? sessions.reduce((s, a) => s + a.questions_done, 0) / sessions.length
    : 0;

  // Recent error streak (last N questions)
  const recent = questions.slice(-10);
  let errorStreak = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (!recent[i].is_correct) errorStreak++;
    else break;
  }

  // Infer/update learning profile
  const inferredProfile = inferLearningProfile({
    total_questions: totalQ,
    overall_accuracy: accuracy,
    avg_session_questions: avg_session,
    error_streak: errorStreak
  });

  // Persist updated learning_profile back to profiles (non-blocking)
  supabase.from('profiles')
    .update({ learning_profile: inferredProfile })
    .eq('id', userId)
    .catch(() => {});

  // Grade trajectory
  const trajectory = profile.target_grade
    ? gradeTrajectory(accuracy, profile.target_grade)
    : null;

  // Weak topics
  const weakTopics = identifyWeakTopics(questions, 0.65).slice(0, 5);

  return res.status(200).json({
    review_queue:     reviewQueue,
    weak_topics:      weakTopics,
    learning_profile: inferredProfile,
    grade_trajectory: trajectory,
    stats: {
      accuracy_pct:     Math.round(accuracy * 100),
      total_questions:  totalQ,
      streak:           profile.streak || 0,
      reviews_due:      reviewQueue.length
    }
  });
}

// ─── update_mastery ───────────────────────────────────────────────────────────
// Called (fire-and-forget) after a question is answered in the UI.
// Delegates to the DB stored procedure which runs SM-2 in Postgres.

async function handleUpdateMastery(res, userId, body) {
  const { topic, module: mod, is_correct, difficulty } = body;

  if (!topic) return res.status(400).json({ error: 'topic required' });

  const { error } = await supabase.rpc('update_topic_mastery', {
    p_user_id:   userId,
    p_topic:     topic,
    p_module:    mod || null,
    p_correct:   Boolean(is_correct),
    p_difficulty: Number(difficulty) || 3
  });

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ success: true });
}

// ─── get_session_driven_topics ────────────────────────────────────────────────
// Uses jarvis_sessions.specific_errors to surface the topics a student
// most needs to review — closing the loop between AI tutoring and practice.

async function handleGetSessionDrivenTopics(res, userId) {
  const { data: sessions, error } = await supabase
    .from('jarvis_sessions')
    .select('topic, mastery_score, specific_errors, session_date')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });

  // Aggregate error frequency across sessions
  const errorFreq = {};
  const topicLowMastery = {};

  for (const s of (sessions || [])) {
    // Track topics with low mastery
    if (s.topic && s.mastery_score != null && s.mastery_score < 0.6) {
      topicLowMastery[s.topic] = (topicLowMastery[s.topic] || 0) + 1;
    }
    // Aggregate specific errors
    for (const e of (s.specific_errors || [])) {
      errorFreq[e] = (errorFreq[e] || 0) + 1;
    }
  }

  // Persistent errors: appeared in 2+ sessions
  const persistentErrors = Object.entries(errorFreq)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([error, frequency]) => ({ error, frequency }));

  // Topics with repeated low mastery scores
  const weakTopics = Object.entries(topicLowMastery)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, sessions_below_threshold]) => ({ topic, sessions_below_threshold }));

  return res.status(200).json({ persistent_errors: persistentErrors, weak_topics: weakTopics });
}
