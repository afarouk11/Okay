import { describe, it, expect } from 'vitest';
import {
  sm2Update,
  answerQuality,
  computeMasteryLevel,
  zpdDifficulty,
  inferLearningProfile,
  identifyWeakTopics,
  predictGrade,
  gradeTrajectory,
} from '../../src/adaptive.js';

// ─── sm2Update ────────────────────────────────────────────────────────────────
// Reference values validated against the original SM-2 paper (Wozniak, 1990).

describe('sm2Update', () => {
  const baseState = { easiness_factor: 2.5, interval_days: 1, repetitions: 0 };

  it('resets repetitions and interval on quality < 3', () => {
    const r = sm2Update({ easiness_factor: 2.5, interval_days: 6, repetitions: 2 }, 1);
    expect(r.repetitions).toBe(0);
    expect(r.interval_days).toBe(1);
    expect(r.next_review_days).toBe(1);
  });

  it('keeps easiness_factor unchanged on failure', () => {
    const r = sm2Update({ easiness_factor: 2.4, interval_days: 4, repetitions: 3 }, 0);
    expect(r.easiness_factor).toBeCloseTo(2.4);
  });

  it('returns interval=1 on first correct repetition', () => {
    const r = sm2Update(baseState, 5);
    expect(r.interval_days).toBe(1);
    expect(r.repetitions).toBe(1);
  });

  it('returns interval=6 on second correct repetition', () => {
    const r = sm2Update({ easiness_factor: 2.5, interval_days: 1, repetitions: 1 }, 5);
    expect(r.interval_days).toBe(6);
    expect(r.repetitions).toBe(2);
  });

  it('multiplies interval by updated EF on third+ correct repetition', () => {
    // EF is updated first: 2.5 + 0.1 = 2.6, then interval = round(6 * 2.6) = 16
    const r = sm2Update({ easiness_factor: 2.5, interval_days: 6, repetitions: 2 }, 5);
    expect(r.interval_days).toBe(16);
    expect(r.repetitions).toBe(3);
  });

  it('increases EF slightly for perfect quality (5)', () => {
    const r = sm2Update(baseState, 5);
    // EF = 2.5 + 0.1 - 0 = 2.6
    expect(r.easiness_factor).toBeCloseTo(2.6, 5);
  });

  it('decreases EF for quality 3 (correct but hard)', () => {
    const r = sm2Update(baseState, 3);
    // EF = 2.5 + 0.1 - (5-3)*(0.08 + (5-3)*0.02) = 2.5 + 0.1 - 0.24 = 2.36
    expect(r.easiness_factor).toBeCloseTo(2.36, 5);
  });

  it('clamps easiness_factor to minimum 1.3', () => {
    // Repeatedly answer with quality=3 until EF hits floor
    let state = { easiness_factor: 1.35, interval_days: 1, repetitions: 2 };
    state = sm2Update(state, 3);
    expect(state.easiness_factor).toBeGreaterThanOrEqual(1.3);
  });

  it('next_review_days matches interval_days', () => {
    const r = sm2Update({ easiness_factor: 2.5, interval_days: 6, repetitions: 2 }, 4);
    expect(r.next_review_days).toBe(r.interval_days);
  });
});

// ─── answerQuality ────────────────────────────────────────────────────────────

describe('answerQuality', () => {
  it('returns 1 for incorrect answer regardless of difficulty', () => {
    expect(answerQuality(false, 1)).toBe(1);
    expect(answerQuality(false, 3)).toBe(1);
    expect(answerQuality(false, 5)).toBe(1);
  });

  it('returns 5 for correct answer at low difficulty (1)', () => {
    expect(answerQuality(true, 1)).toBe(5);
  });

  it('returns 4 for correct answer at moderate difficulty (2-3)', () => {
    expect(answerQuality(true, 2)).toBe(4);
    expect(answerQuality(true, 3)).toBe(4);
  });

  it('returns 3 for correct answer at high difficulty (4-5)', () => {
    expect(answerQuality(true, 4)).toBe(3);
    expect(answerQuality(true, 5)).toBe(3);
  });
});

// ─── computeMasteryLevel ─────────────────────────────────────────────────────

describe('computeMasteryLevel', () => {
  it('returns 0 when there are no repetitions', () => {
    expect(computeMasteryLevel(0, 0, 0)).toBe(0);
    expect(computeMasteryLevel(0, 5, 5)).toBe(0);
  });

  it('returns 1 after first repetition regardless of accuracy', () => {
    expect(computeMasteryLevel(1, 0, 1)).toBe(1);
    expect(computeMasteryLevel(1, 1, 1)).toBe(1);
  });

  it('returns 2 at 2 reps with ≥60% accuracy', () => {
    expect(computeMasteryLevel(2, 6, 10)).toBe(2);  // 60%
  });

  it('returns 1 at 2 reps with <60% accuracy', () => {
    expect(computeMasteryLevel(2, 5, 10)).toBe(1);  // 50%
  });

  it('returns 3 at 3 reps with ≥70% accuracy', () => {
    expect(computeMasteryLevel(3, 7, 10)).toBe(3);  // 70%
  });

  it('returns 4 at 4 reps with ≥80% accuracy', () => {
    expect(computeMasteryLevel(4, 8, 10)).toBe(4);  // 80%
  });

  it('returns 5 at 5 reps with ≥90% accuracy', () => {
    expect(computeMasteryLevel(5, 9, 10)).toBe(5);  // 90%
  });

  it('returns 4 at 5 reps with 89% accuracy (not quite level 5)', () => {
    expect(computeMasteryLevel(5, 89, 100)).toBe(4); // 89%
  });
});

// ─── zpdDifficulty ────────────────────────────────────────────────────────────

describe('zpdDifficulty', () => {
  it('returns 1 for mastery level 0 (unseen topic)', () => {
    expect(zpdDifficulty(0)).toBe(1);
  });

  it('returns mastery + 1 for mid-range mastery', () => {
    expect(zpdDifficulty(1)).toBe(2);
    expect(zpdDifficulty(2)).toBe(3);
    expect(zpdDifficulty(3)).toBe(4);
    expect(zpdDifficulty(4)).toBe(5);
  });

  it('caps at difficulty 5 for mastery level 5', () => {
    expect(zpdDifficulty(5)).toBe(5);
  });
});

// ─── inferLearningProfile ─────────────────────────────────────────────────────

describe('inferLearningProfile', () => {
  it('classifies a high-accuracy, high-volume student as fast + brief', () => {
    const p = inferLearningProfile({ overall_accuracy: 0.88, avg_session_questions: 20, error_streak: 0 });
    expect(p.preferred_pace).toBe('fast');
    expect(p.explanation_depth).toBe('brief');
    expect(p.needs_scaffolding).toBe(false);
  });

  it('classifies a low-accuracy student as slow + detailed + scaffolding', () => {
    const p = inferLearningProfile({ overall_accuracy: 0.45, avg_session_questions: 4, error_streak: 4 });
    expect(p.preferred_pace).toBe('slow');
    expect(p.explanation_depth).toBe('detailed');
    expect(p.needs_scaffolding).toBe(true);
  });

  it('requires scaffolding when error streak ≥ 3', () => {
    const p = inferLearningProfile({ overall_accuracy: 0.7, avg_session_questions: 10, error_streak: 3 });
    expect(p.needs_scaffolding).toBe(true);
  });

  it('classifies a moderate student as normal pace', () => {
    const p = inferLearningProfile({ overall_accuracy: 0.68, avg_session_questions: 10, error_streak: 1 });
    expect(p.preferred_pace).toBe('normal');
  });
});

// ─── identifyWeakTopics ───────────────────────────────────────────────────────

describe('identifyWeakTopics', () => {
  const makeQ = (topic, is_correct) => ({ topic, is_correct });

  it('returns empty array when there are no questions', () => {
    expect(identifyWeakTopics([])).toEqual([]);
  });

  it('excludes topics with fewer than 3 attempts', () => {
    const qs = [makeQ('Integration', false), makeQ('Integration', false)];
    expect(identifyWeakTopics(qs)).toEqual([]);
  });

  it('identifies topics below 65% accuracy', () => {
    const qs = [
      makeQ('Integration', false), makeQ('Integration', false),
      makeQ('Integration', true),  makeQ('Integration', false), // 1/4 = 25%
    ];
    const result = identifyWeakTopics(qs);
    expect(result.length).toBe(1);
    expect(result[0].topic).toBe('Integration');
    expect(result[0].accuracy).toBeCloseTo(0.25);
  });

  it('excludes topics at or above the threshold', () => {
    const qs = [
      makeQ('Differentiation', true), makeQ('Differentiation', true),
      makeQ('Differentiation', true), // 3/3 = 100%
    ];
    expect(identifyWeakTopics(qs)).toEqual([]);
  });

  it('sorts worst topic first', () => {
    const qs = [
      makeQ('A', false), makeQ('A', false), makeQ('A', true),   // 33%
      makeQ('B', false), makeQ('B', true),  makeQ('B', true),   // 67% → excluded
      makeQ('C', false), makeQ('C', false), makeQ('C', false),  // 0%
    ];
    const result = identifyWeakTopics(qs);
    expect(result[0].topic).toBe('C'); // worst first
    expect(result[1].topic).toBe('A');
  });

  it('skips questions with no topic', () => {
    const qs = [{ is_correct: false }, { is_correct: true }, { is_correct: false }];
    expect(identifyWeakTopics(qs)).toEqual([]);
  });
});

// ─── predictGrade ─────────────────────────────────────────────────────────────

describe('predictGrade', () => {
  it('predicts A* at ≥90% accuracy', () => {
    expect(predictGrade(0.9)).toBe('A*');
    expect(predictGrade(1.0)).toBe('A*');
  });

  it('predicts A at 80-89%', () => {
    expect(predictGrade(0.8)).toBe('A');
    expect(predictGrade(0.89)).toBe('A');
  });

  it('predicts B at 70-79%', () => {
    expect(predictGrade(0.7)).toBe('B');
  });

  it('predicts U at 0%', () => {
    expect(predictGrade(0)).toBe('U');
  });

  it('predicts E at 40-49%', () => {
    expect(predictGrade(0.4)).toBe('E');
    expect(predictGrade(0.49)).toBe('E');
  });
});

// ─── gradeTrajectory ─────────────────────────────────────────────────────────

describe('gradeTrajectory', () => {
  it('reports on_track when predicted matches target', () => {
    const t = gradeTrajectory(0.82, 'A');
    expect(t.on_track).toBe(true);
    expect(t.predicted).toBe('A');
    expect(t.gap).toBe(0);
  });

  it('reports on_track when predicted exceeds target', () => {
    const t = gradeTrajectory(0.95, 'A');
    expect(t.on_track).toBe(true);
    expect(t.predicted).toBe('A*');
    expect(t.gap).toBeLessThan(0); // exceeding target
  });

  it('reports not on_track with positive gap when below target', () => {
    const t = gradeTrajectory(0.72, 'A*');
    expect(t.on_track).toBe(false);
    expect(t.gap).toBeGreaterThan(0);
  });

  it('returns correct predicted and target fields', () => {
    const t = gradeTrajectory(0.65, 'B');
    expect(t.target).toBe('B');
    expect(['C', 'D', 'E', 'U']).toContain(t.predicted);
  });
});
