/**
 * Pure adaptive-learning functions — no DOM, no network, no globals.
 *
 * Implements the SM-2 spaced-repetition algorithm and supporting utilities
 * used by both the backend (api/adaptive.js) and the frontend.
 * All functions are fully unit-testable (see tests/adaptive.test.js).
 *
 * Scientific foundations:
 *   • SM-2 spaced repetition  (Wozniak, 1990)
 *   • Zone of Proximal Development — difficulty = mastery + 1
 *   • Bloom's Taxonomy tiers mapped to mastery levels 0-5
 *   • Cognitive Load Theory — explanation_depth derived from error patterns
 */

// ─── SM-2 Algorithm ───────────────────────────────────────────────────────────

/**
 * Run one SM-2 iteration.
 *
 * @param {{ easiness_factor: number, interval_days: number, repetitions: number }} state
 * @param {number} quality  0-5  (0=complete blackout, 5=perfect recall)
 * @returns {{ easiness_factor: number, interval_days: number, repetitions: number, next_review_days: number }}
 */
export function sm2Update(state, quality) {
  const { easiness_factor: ef, interval_days: interval, repetitions: reps } = state;

  if (quality < 3) {
    // Incorrect or near-miss: reset repetitions and interval, keep EF unchanged
    return {
      easiness_factor: ef,
      interval_days: 1,
      repetitions: 0,
      next_review_days: 1
    };
  }

  // Correct response: update easiness factor
  const new_ef = Math.max(1.3,
    ef + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  // Advance interval according to SM-2 schedule
  let new_interval;
  if (reps === 0) {
    new_interval = 1;
  } else if (reps === 1) {
    new_interval = 6;
  } else {
    new_interval = Math.round(interval * new_ef);
  }

  return {
    easiness_factor: new_ef,
    interval_days: new_interval,
    repetitions: reps + 1,
    next_review_days: new_interval
  };
}

/**
 * Map a question result to an SM-2 quality score (0-5).
 * Difficulty 1-5 corresponds to the question's difficulty setting.
 *
 * @param {boolean} is_correct
 * @param {number}  difficulty  1-5
 * @returns {number}  quality 0-5
 */
export function answerQuality(is_correct, difficulty) {
  if (!is_correct) return 1;
  if (difficulty >= 4) return 3;   // correct but hard
  if (difficulty >= 2) return 4;   // correct, moderate
  return 5;                        // correct, easy
}

// ─── Mastery Level ────────────────────────────────────────────────────────────

/**
 * Compute a Bloom's-taxonomy-aligned mastery level (0-5) from SM-2 state.
 *
 * Level  Bloom tier          Requirement
 *   0    Unseen              no attempts
 *   1    Remember/Recall     ≥1 repetition
 *   2    Understand          ≥2 reps, ≥60% accuracy
 *   3    Apply               ≥3 reps, ≥70% accuracy
 *   4    Analyse             ≥4 reps, ≥80% accuracy
 *   5    Evaluate/Create     ≥5 reps, ≥90% accuracy
 *
 * @param {number} repetitions
 * @param {number} correct_attempts
 * @param {number} total_attempts
 * @returns {number}  0-5
 */
export function computeMasteryLevel(repetitions, correct_attempts, total_attempts) {
  const accuracy = total_attempts > 0 ? correct_attempts / total_attempts : 0;

  if (repetitions >= 5 && accuracy >= 0.9) return 5;
  if (repetitions >= 4 && accuracy >= 0.8) return 4;
  if (repetitions >= 3 && accuracy >= 0.7) return 3;
  if (repetitions >= 2 && accuracy >= 0.6) return 2;
  if (repetitions >= 1) return 1;
  return 0;
}

/**
 * Suggested question difficulty for Zone of Proximal Development targeting.
 * Returns the difficulty just above the student's current mastery (capped at 5).
 *
 * @param {number} mastery_level  0-5
 * @returns {number}  recommended difficulty 1-5
 */
export function zpdDifficulty(mastery_level) {
  return Math.min(5, Math.max(1, mastery_level + 1));
}

// ─── Learning Profile Inference ───────────────────────────────────────────────

/**
 * Derive a learning profile from aggregated performance data.
 * Used to inform the AI tutor's explanation depth and pacing.
 *
 * @param {{ total_questions: number, overall_accuracy: number, avg_session_questions: number, error_streak: number }} stats
 * @returns {{ preferred_pace: string, needs_scaffolding: boolean, explanation_depth: string }}
 */
export function inferLearningProfile(stats) {
  const { overall_accuracy, avg_session_questions, error_streak } = stats;

  // Pace: fast learners do many questions per session with high accuracy
  let preferred_pace;
  if (overall_accuracy >= 0.8 && avg_session_questions >= 15) {
    preferred_pace = 'fast';
  } else if (overall_accuracy < 0.55 || avg_session_questions < 5) {
    preferred_pace = 'slow';
  } else {
    preferred_pace = 'normal';
  }

  // Scaffolding: student needs step-by-step guidance if accuracy is low
  // or they have a streak of recent errors
  const needs_scaffolding = overall_accuracy < 0.6 || error_streak >= 3;

  // Explanation depth: brief for confident students, detailed for struggling ones
  const explanation_depth = overall_accuracy >= 0.75 ? 'brief' : 'detailed';

  return { preferred_pace, needs_scaffolding, explanation_depth };
}

// ─── Knowledge Gap Analysis ───────────────────────────────────────────────────

/**
 * Identify weak topics from a list of question records.
 * Returns topics below the accuracy threshold, sorted worst-first.
 *
 * @param {Array<{ topic: string, is_correct: boolean }>} questions
 * @param {number} [threshold=0.65]  accuracy below which a topic is "weak"
 * @returns {Array<{ topic: string, accuracy: number, attempts: number }>}
 */
export function identifyWeakTopics(questions, threshold = 0.65) {
  const byTopic = {};

  for (const q of questions) {
    if (!q.topic) continue;
    if (!byTopic[q.topic]) byTopic[q.topic] = { correct: 0, total: 0 };
    byTopic[q.topic].total++;
    if (q.is_correct) byTopic[q.topic].correct++;
  }

  return Object.entries(byTopic)
    .map(([topic, { correct, total }]) => ({
      topic,
      accuracy: total > 0 ? correct / total : 0,
      attempts: total
    }))
    .filter(t => t.attempts >= 3 && t.accuracy < threshold)
    .sort((a, b) => a.accuracy - b.accuracy);
}

// ─── Grade Prediction ─────────────────────────────────────────────────────────

// A-level grade boundaries (approximate accuracy ranges)
const GRADE_BOUNDARIES = [
  { grade: 'A*', min: 0.90 },
  { grade: 'A',  min: 0.80 },
  { grade: 'B',  min: 0.70 },
  { grade: 'C',  min: 0.60 },
  { grade: 'D',  min: 0.50 },
  { grade: 'E',  min: 0.40 },
  { grade: 'U',  min: 0.00 }
];

/**
 * Predict a student's likely grade from their overall accuracy.
 *
 * @param {number} accuracy  0-1
 * @returns {string}  e.g. 'A', 'B', 'U'
 */
export function predictGrade(accuracy) {
  for (const { grade, min } of GRADE_BOUNDARIES) {
    if (accuracy >= min) return grade;
  }
  return 'U';
}

/**
 * Whether the student is on track for their target grade.
 *
 * @param {number} accuracy      0-1
 * @param {string} target_grade  e.g. 'A*'
 * @returns {{ on_track: boolean, predicted: string, target: string, gap: number }}
 */
export function gradeTrajectory(accuracy, target_grade) {
  const predicted = predictGrade(accuracy);
  const gradeOrder = ['U', 'E', 'D', 'C', 'B', 'A', 'A*'];
  const predictedIdx = gradeOrder.indexOf(predicted);
  const targetIdx = gradeOrder.indexOf(target_grade);

  return {
    on_track: predictedIdx >= targetIdx,
    predicted,
    target: target_grade,
    gap: targetIdx - predictedIdx   // negative = exceeding target
  };
}

// ─── Adaptive Multi-Feature Grade Predictor ───────────────────────────────────

/**
 * Adaptive grade predictor using weighted multi-feature scoring with recency bias.
 *
 * Features:
 *   accuracy          — overall correct/total across all questions
 *   recentSessionScore — average mastery_score of last 5 jarvis sessions (null if < 3 sessions)
 *   olderSessionScore  — average mastery_score of sessions 6-10 (null if insufficient)
 *   topicCoverage     — fraction of ~34 A-level topics practiced (0-1)
 *   masteredFraction  — fraction of practiced topics with mastery_level >= 3 (0-1)
 *   totalAttempts     — total questions answered
 *   sessionsThisWeek  — number of study days in last 7 days
 *
 * @param {Object} features
 * @returns {{ grade: string, confidence: 'high'|'medium'|'low', score: number, trend: 'improving'|'stable'|'declining'|'new' }}
 */
export function predictGradeML(features) {
  const {
    accuracy,
    recentSessionScore,
    olderSessionScore,
    topicCoverage,
    masteredFraction,
    totalAttempts,
    sessionsThisWeek,
  } = features;

  if (totalAttempts < 10) {
    return { grade: '?', confidence: 'low', score: 0, trend: 'new' };
  }

  // Recency-biased accuracy: if we have recent session data, blend it in
  // (RL-style: recent outcomes get higher weight than historical baseline)
  let effectiveAccuracy = accuracy;
  if (recentSessionScore !== null) {
    // Weight recent session mastery 50%, overall accuracy 50%
    effectiveAccuracy = recentSessionScore * 0.5 + accuracy * 0.5;
  }

  // Feature weights (sum to 1.0)
  const W = {
    accuracy: 0.40,
    coverage: 0.20,
    mastery:  0.20,
    trend:    0.20,
  };

  // Trend signal: how much recent sessions outperform older ones
  let trendScore = effectiveAccuracy; // fallback to blended accuracy
  if (recentSessionScore !== null && olderSessionScore !== null) {
    // Slope scaled into 0-1: 0.5 = neutral, higher = improving
    const slope = recentSessionScore - olderSessionScore;
    trendScore = Math.max(0, Math.min(1, effectiveAccuracy + slope * 0.5));
  }

  // Coverage score — slight boost above 50% coverage
  const coverageScore = Math.min(1, topicCoverage * 1.2);

  // Consistency micro-bonus (max 0.04)
  const consistencyBonus = Math.min(0.04, (sessionsThisWeek ?? 0) * 0.006);

  const rawScore =
    W.accuracy * effectiveAccuracy +
    W.coverage * coverageScore +
    W.mastery  * (masteredFraction ?? 0) +
    W.trend    * trendScore +
    consistencyBonus;

  const score = Math.max(0, Math.min(1, rawScore));

  const BOUNDARIES = [
    { grade: 'A*', min: 0.88 },
    { grade: 'A',  min: 0.76 },
    { grade: 'B',  min: 0.64 },
    { grade: 'C',  min: 0.52 },
    { grade: 'D',  min: 0.42 },
    { grade: 'E',  min: 0.32 },
    { grade: 'U',  min: 0.00 },
  ];
  const grade = (BOUNDARIES.find(b => score >= b.min) ?? BOUNDARIES[BOUNDARIES.length - 1]).grade;

  const confidence =
    totalAttempts >= 80 && topicCoverage >= 0.4 ? 'high' :
    totalAttempts >= 30 || topicCoverage >= 0.2 ? 'medium' : 'low';

  let trend = 'stable';
  if (recentSessionScore !== null && olderSessionScore !== null) {
    const delta = recentSessionScore - olderSessionScore;
    if (delta > 0.06) trend = 'improving';
    else if (delta < -0.06) trend = 'declining';
  } else if (recentSessionScore === null) {
    trend = 'new';
  }

  return { grade, confidence, score: Math.round(score * 100), trend };
}
