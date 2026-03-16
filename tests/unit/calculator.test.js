import { describe, it, expect } from 'vitest';
import {
  calcInput,
  calcEquals,
  calcClear,
  calcDelete,
  INITIAL_STATE,
  OPERATORS,
} from '../../src/calculator.js';

describe('INITIAL_STATE', () => {
  it('has empty value, prev, and op', () => {
    expect(INITIAL_STATE).toEqual({ value: '', prev: '', op: '' });
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(INITIAL_STATE)).toBe(true);
  });
});

describe('OPERATORS', () => {
  it('includes +, −, ×, ÷', () => {
    expect(OPERATORS).toContain('+');
    expect(OPERATORS).toContain('−');
    expect(OPERATORS).toContain('×');
    expect(OPERATORS).toContain('÷');
  });
});

// ─── calcInput: digits ────────────────────────────────────────────────────────

describe('calcInput — digits', () => {
  it('appends a digit to an empty value', () => {
    expect(calcInput(INITIAL_STATE, '7').value).toBe('7');
  });

  it('concatenates multiple digits', () => {
    let s = calcInput(INITIAL_STATE, '4');
    s = calcInput(s, '2');
    expect(s.value).toBe('42');
  });

  it('replaces a lone "0" instead of prepending', () => {
    const s = calcInput({ ...INITIAL_STATE, value: '0' }, '3');
    expect(s.value).toBe('3');
  });

  it('does not mutate the input state', () => {
    const original = { ...INITIAL_STATE, value: '9' };
    calcInput(original, '1');
    expect(original.value).toBe('9');
  });
});

// ─── calcInput: decimal point ─────────────────────────────────────────────────

describe('calcInput — decimal point', () => {
  it('appends decimal point to an integer', () => {
    expect(calcInput({ ...INITIAL_STATE, value: '5' }, '.').value).toBe('5.');
  });

  it('prefixes 0 when there is no integer part', () => {
    expect(calcInput(INITIAL_STATE, '.').value).toBe('0.');
  });

  it('ignores a second decimal point in the same number', () => {
    const s = calcInput({ ...INITIAL_STATE, value: '2.' }, '.');
    expect(s.value).toBe('2.');
  });

  it('allows digits after the decimal point', () => {
    let s = calcInput(INITIAL_STATE, '1');
    s = calcInput(s, '.');
    s = calcInput(s, '6');
    s = calcInput(s, '8');
    expect(s.value).toBe('1.68');
  });
});

// ─── calcInput: operators ─────────────────────────────────────────────────────

describe('calcInput — operators', () => {
  it.each(OPERATORS)('records operator "%s" and moves value to prev', (op) => {
    const s = calcInput({ ...INITIAL_STATE, value: '8' }, op);
    expect(s.op).toBe(op);
    expect(s.prev).toBe('8');
    expect(s.value).toBe('');
  });

  it('does nothing when value is empty and operator is pressed', () => {
    const s = calcInput(INITIAL_STATE, '+');
    expect(s.op).toBe('');
    expect(s.prev).toBe('');
  });

  it('keeps the first operator when a second is pressed without a new value', () => {
    let s = calcInput({ ...INITIAL_STATE, value: '5' }, '+');
    s = calcInput(s, '×'); // no new value entered yet
    expect(s.op).toBe('+');
  });
});

// ─── calcEquals ───────────────────────────────────────────────────────────────

describe('calcEquals', () => {
  it('adds two numbers', () => {
    expect(calcEquals({ value: '4', prev: '7', op: '+' }).result).toBe(11);
  });

  it('subtracts', () => {
    expect(calcEquals({ value: '5', prev: '15', op: '−' }).result).toBe(10);
  });

  it('multiplies', () => {
    expect(calcEquals({ value: '7', prev: '8', op: '×' }).result).toBe(56);
  });

  it('divides', () => {
    expect(calcEquals({ value: '5', prev: '25', op: '÷' }).result).toBe(5);
  });

  it('returns "Error" for division by zero', () => {
    expect(calcEquals({ value: '0', prev: '9', op: '÷' }).result).toBe('Error');
  });

  it('stores the result as string in value', () => {
    const s = calcEquals({ value: '2', prev: '8', op: '+' });
    expect(s.value).toBe('10');
  });

  it('clears prev and op after evaluation', () => {
    const s = calcEquals({ value: '3', prev: '6', op: '×' });
    expect(s.prev).toBe('');
    expect(s.op).toBe('');
  });

  it('handles decimal operands', () => {
    const s = calcEquals({ value: '0.5', prev: '2.5', op: '+' });
    expect(parseFloat(s.value)).toBeCloseTo(3.0);
  });

  it('returns state unchanged when value is missing', () => {
    const s = { value: '', prev: '5', op: '+' };
    expect(calcEquals(s)).toEqual(s);
  });

  it('returns state unchanged when prev is missing', () => {
    const s = { value: '3', prev: '', op: '+' };
    expect(calcEquals(s)).toEqual(s);
  });

  it('returns state unchanged when op is missing', () => {
    const s = { value: '3', prev: '5', op: '' };
    expect(calcEquals(s)).toEqual(s);
  });

  it('handles large multiplications without overflow', () => {
    const s = calcEquals({ value: '999999', prev: '999999', op: '×' });
    expect(s.result).toBe(999_998_000_001);
  });
});

// ─── calcClear ────────────────────────────────────────────────────────────────

describe('calcClear', () => {
  it('returns the initial state shape', () => {
    expect(calcClear()).toEqual(INITIAL_STATE);
  });

  it('resets a mid-expression state back to blank', () => {
    const mid = { value: '7', prev: '3', op: '+' };
    expect(calcClear(mid)).toEqual(INITIAL_STATE);
  });
});

// ─── calcDelete ───────────────────────────────────────────────────────────────

describe('calcDelete', () => {
  it('removes the last character', () => {
    expect(calcDelete({ ...INITIAL_STATE, value: '456' }).value).toBe('45');
  });

  it('produces an empty string when only one digit remains', () => {
    expect(calcDelete({ ...INITIAL_STATE, value: '9' }).value).toBe('');
  });

  it('is a no-op on an empty value', () => {
    expect(calcDelete(INITIAL_STATE).value).toBe('');
  });

  it('removes a trailing decimal point', () => {
    expect(calcDelete({ ...INITIAL_STATE, value: '6.' }).value).toBe('6');
  });

  it('does not mutate the original state', () => {
    const original = { ...INITIAL_STATE, value: '88' };
    calcDelete(original);
    expect(original.value).toBe('88');
  });
});

// ─── full workflow ────────────────────────────────────────────────────────────

describe('full workflow', () => {
  it('computes 9 × 9 = 81', () => {
    let s = INITIAL_STATE;
    s = calcInput(s, '9');
    s = calcInput(s, '×');
    s = calcInput(s, '9');
    s = calcEquals(s);
    expect(s.result).toBe(81);
  });

  it('chains multiple operations', () => {
    let s = INITIAL_STATE;
    // 6 + 4 = 10
    s = calcInput(s, '6');
    s = calcInput(s, '+');
    s = calcInput(s, '4');
    s = calcEquals(s);
    // 10 ÷ 2 = 5
    s = calcInput(s, '÷');
    s = calcInput(s, '2');
    s = calcEquals(s);
    expect(s.result).toBe(5);
  });

  it('clear in the middle resets to initial state', () => {
    let s = calcInput(INITIAL_STATE, '5');
    s = calcInput(s, '+');
    s = calcClear();
    expect(s).toEqual(INITIAL_STATE);
  });
});
