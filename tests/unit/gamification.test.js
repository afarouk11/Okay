import { describe, it, expect } from 'vitest';
import {
  computeLevel,
  xpInLevel,
  levelProgress,
  applyXP,
  addActivityEntry,
  XP_PER_LEVEL,
} from '../../src/gamification.js';

// ─── computeLevel ─────────────────────────────────────────────────────────────

describe('computeLevel', () => {
  it('returns level 1 at 0 XP', () => {
    expect(computeLevel(0)).toBe(1);
  });

  it('stays at level 1 up to (XP_PER_LEVEL − 1) XP', () => {
    expect(computeLevel(XP_PER_LEVEL - 1)).toBe(1);
  });

  it('advances to level 2 at exactly XP_PER_LEVEL', () => {
    expect(computeLevel(XP_PER_LEVEL)).toBe(2);
  });

  it('advances to level 3 at 2 × XP_PER_LEVEL', () => {
    expect(computeLevel(XP_PER_LEVEL * 2)).toBe(3);
  });

  it('handles double-digit levels', () => {
    expect(computeLevel(XP_PER_LEVEL * 9)).toBe(10);
    expect(computeLevel(XP_PER_LEVEL * 19)).toBe(20);
  });

  it('correctly handles XP just above a threshold', () => {
    expect(computeLevel(XP_PER_LEVEL + 1)).toBe(2);
    expect(computeLevel(XP_PER_LEVEL * 2 + 1)).toBe(3);
  });
});

// ─── xpInLevel ────────────────────────────────────────────────────────────────

describe('xpInLevel', () => {
  it('returns the full XP amount when within the first level', () => {
    expect(xpInLevel(100)).toBe(100);
  });

  it('returns 0 exactly at a level boundary', () => {
    expect(xpInLevel(XP_PER_LEVEL)).toBe(0);
    expect(xpInLevel(XP_PER_LEVEL * 3)).toBe(0);
  });

  it('returns the remainder beyond the last threshold', () => {
    expect(xpInLevel(XP_PER_LEVEL + 75)).toBe(75);
    expect(xpInLevel(XP_PER_LEVEL * 2 + 30)).toBe(30);
  });
});

// ─── levelProgress ────────────────────────────────────────────────────────────

describe('levelProgress', () => {
  it('returns 0 at XP 0', () => {
    expect(levelProgress(0)).toBe(0);
  });

  it('returns 0 at each level boundary', () => {
    expect(levelProgress(XP_PER_LEVEL)).toBe(0);
    expect(levelProgress(XP_PER_LEVEL * 4)).toBe(0);
  });

  it('returns 0.5 halfway through a level', () => {
    expect(levelProgress(XP_PER_LEVEL / 2)).toBe(0.5);
    expect(levelProgress(XP_PER_LEVEL + XP_PER_LEVEL / 2)).toBe(0.5);
  });

  it('approaches 1 just before a level boundary', () => {
    expect(levelProgress(XP_PER_LEVEL - 1)).toBeCloseTo((XP_PER_LEVEL - 1) / XP_PER_LEVEL);
  });
});

// ─── applyXP ──────────────────────────────────────────────────────────────────

describe('applyXP', () => {
  it('adds positive XP to current total', () => {
    const result = applyXP({ xp: 50, level: 1 }, 100);
    expect(result.xp).toBe(150);
  });

  it('does not signal leveledUp when within the same level', () => {
    const result = applyXP({ xp: 10, level: 1 }, 30);
    expect(result.leveledUp).toBe(false);
    expect(result.level).toBe(1);
  });

  it('signals leveledUp when a level boundary is crossed', () => {
    const result = applyXP({ xp: XP_PER_LEVEL - 5, level: 1 }, 10);
    expect(result.leveledUp).toBe(true);
    expect(result.level).toBe(2);
  });

  it('can skip multiple levels in one award', () => {
    const result = applyXP({ xp: 0, level: 1 }, XP_PER_LEVEL * 4);
    expect(result.level).toBe(5);
    expect(result.leveledUp).toBe(true);
  });

  it('clamps negative amounts to 0 so XP cannot decrease', () => {
    // Use xp: 50 (well within level 1) so the clamped-to-0 delta does not cross a level boundary
    const result = applyXP({ xp: 50, level: 1 }, -100);
    expect(result.xp).toBe(50);
    expect(result.leveledUp).toBe(false);
  });

  it('handles 0 XP award without error', () => {
    const result = applyXP({ xp: 80, level: 1 }, 0);
    expect(result.xp).toBe(80);
    expect(result.leveledUp).toBe(false);
  });

  it('does not mutate the original state', () => {
    const original = { xp: 50, level: 1 };
    applyXP(original, 300);
    expect(original.xp).toBe(50);
    expect(original.level).toBe(1);
  });
});

// ─── addActivityEntry ─────────────────────────────────────────────────────────

describe('addActivityEntry', () => {
  it('creates a new entry for a fresh date', () => {
    const result = addActivityEntry({}, 60, '2025-01-15');
    expect(result['2025-01-15']).toBe(60);
  });

  it('accumulates XP when the same date already has an entry', () => {
    const log = { '2025-01-15': 40 };
    const result = addActivityEntry(log, 60, '2025-01-15');
    expect(result['2025-01-15']).toBe(100);
  });

  it('leaves existing dates untouched when adding a new date', () => {
    const log = { '2025-01-14': 90 };
    const result = addActivityEntry(log, 25, '2025-01-15');
    expect(result['2025-01-14']).toBe(90);
    expect(result['2025-01-15']).toBe(25);
  });

  it('does not mutate the original log', () => {
    const original = { '2025-01-15': 30 };
    addActivityEntry(original, 70, '2025-01-15');
    expect(original['2025-01-15']).toBe(30);
  });

  it("defaults to today's date when no override is given", () => {
    const today = new Date().toISOString().split('T')[0];
    const result = addActivityEntry({}, 50);
    expect(result[today]).toBe(50);
  });
});
