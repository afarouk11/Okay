/**
 * Unit tests for src/latex-speech.js
 *
 * The module is a pure function — no DOM, no network — so standard Vitest
 * is all that is needed.
 */

import { describe, it, expect } from 'vitest';
import { latexToSpeech } from '../../src/latex-speech.js';

// ── Type safety ───────────────────────────────────────────────────────────────

describe('latexToSpeech — type safety', () => {
  it('returns non-string inputs unchanged', () => {
    expect(latexToSpeech(null)).toBe(null);
    expect(latexToSpeech(undefined)).toBe(undefined);
    expect(latexToSpeech(42)).toBe(42);
  });

  it('returns empty string unchanged', () => {
    expect(latexToSpeech('')).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(latexToSpeech('Hello, Sir.')).toBe('Hello, Sir.');
  });
});

// ── Integrals ─────────────────────────────────────────────────────────────────

describe('latexToSpeech — integrals', () => {
  it('converts a bare integral with integrand and variable', () => {
    const result = latexToSpeech('The answer is \\int x^2 dx.');
    expect(result).toContain('the integral of');
    expect(result).toContain('with respect to x');
  });

  it('converts definite integral with limits', () => {
    const result = latexToSpeech('\\int_{0}^{1} x dx');
    expect(result).toContain('the integral from 0 to 1');
    expect(result).toContain('with respect to x');
  });

  it('converts bare \\int with no context', () => {
    expect(latexToSpeech('\\int')).toContain('the integral');
  });
});

// ── Derivatives ───────────────────────────────────────────────────────────────

describe('latexToSpeech — derivatives', () => {
  it('converts dy/dx Leibniz notation', () => {
    const result = latexToSpeech('\\frac{dy}{dx}');
    expect(result).toContain('the derivative of y with respect to x');
  });

  it('converts generic fraction', () => {
    const result = latexToSpeech('\\frac{a}{b}');
    expect(result).toContain('a over b');
  });

  it('does not garble surrounding text', () => {
    const result = latexToSpeech('We have \\frac{1}{2} of the pie.');
    expect(result).toContain('1 over 2');
    expect(result).toContain('of the pie');
  });
});

// ── Limits ────────────────────────────────────────────────────────────────────

describe('latexToSpeech — limits', () => {
  it('converts \\lim_{x \\to 0}', () => {
    const result = latexToSpeech('\\lim_{x \\to 0} f(x)');
    expect(result).toContain('the limit as x approaches 0');
  });
});

// ── Sums ─────────────────────────────────────────────────────────────────────

describe('latexToSpeech — summations', () => {
  it('converts \\sum_{i=1}^{n}', () => {
    const result = latexToSpeech('\\sum_{i=1}^{n} a_i');
    expect(result).toContain('the sum from i=1 to n of');
  });

  it('converts bare \\sum', () => {
    expect(latexToSpeech('\\sum x')).toContain('the sum of');
  });
});

// ── Square roots ──────────────────────────────────────────────────────────────

describe('latexToSpeech — square roots', () => {
  it('converts \\sqrt{x}', () => {
    expect(latexToSpeech('\\sqrt{x}')).toContain('the square root of x');
  });

  it('converts \\sqrt{x^2 + 1}', () => {
    const result = latexToSpeech('\\sqrt{x^2 + 1}');
    expect(result).toContain('the square root of');
  });
});

// ── Powers ────────────────────────────────────────────────────────────────────

describe('latexToSpeech — powers', () => {
  it('converts x^2 to "x squared"', () => {
    expect(latexToSpeech('x^2')).toContain('x squared');
  });

  it('converts x^{2} to "x squared"', () => {
    expect(latexToSpeech('x^{2}')).toContain('x squared');
  });

  it('converts x^3 to "x cubed"', () => {
    expect(latexToSpeech('x^3')).toContain('x cubed');
  });

  it('converts x^{n} to "x to the power n"', () => {
    expect(latexToSpeech('x^{n}')).toContain('x to the power n');
  });
});

// ── Greek letters ─────────────────────────────────────────────────────────────

describe('latexToSpeech — Greek letters', () => {
  it('converts \\mu to "mu"', () => {
    expect(latexToSpeech('friction coefficient \\mu')).toContain('mu');
  });

  it('converts \\pi to "pi"', () => {
    expect(latexToSpeech('area = \\pi r^2')).toContain('pi');
  });

  it('converts \\theta to "theta"', () => {
    expect(latexToSpeech('angle \\theta')).toContain('theta');
  });

  it('converts \\alpha to "alpha"', () => {
    expect(latexToSpeech('\\alpha + \\beta')).toContain('alpha');
    expect(latexToSpeech('\\alpha + \\beta')).toContain('beta');
  });
});

// ── Trig functions ────────────────────────────────────────────────────────────

describe('latexToSpeech — trig functions', () => {
  it('converts \\sin to "sine"', () => {
    expect(latexToSpeech('\\sin(x)')).toContain('sine');
  });

  it('converts \\cos to "cosine"', () => {
    expect(latexToSpeech('\\cos(x)')).toContain('cosine');
  });

  it('converts \\tan to "tangent"', () => {
    expect(latexToSpeech('\\tan(x)')).toContain('tangent');
  });

  it('converts \\ln to "the natural log of"', () => {
    expect(latexToSpeech('\\ln(x)')).toContain('the natural log of');
  });
});

// ── Operators and symbols ─────────────────────────────────────────────────────

describe('latexToSpeech — operators and symbols', () => {
  it('converts \\infty to "infinity"', () => {
    expect(latexToSpeech('x \\to \\infty')).toContain('infinity');
  });

  it('converts \\pm to "plus or minus"', () => {
    expect(latexToSpeech('x = \\pm 1')).toContain('plus or minus');
  });

  it('converts \\leq to "less than or equal to"', () => {
    expect(latexToSpeech('x \\leq 5')).toContain('less than or equal to');
  });

  it('converts \\geq to "greater than or equal to"', () => {
    expect(latexToSpeech('x \\geq 0')).toContain('greater than or equal to');
  });

  it('converts \\neq to "not equal to"', () => {
    expect(latexToSpeech('x \\neq y')).toContain('not equal to');
  });

  it('converts \\approx to "approximately equal to"', () => {
    expect(latexToSpeech('x \\approx 3.14')).toContain('approximately equal to');
  });
});

// ── Braces and cleanup ────────────────────────────────────────────────────────

describe('latexToSpeech — cleanup', () => {
  it('removes remaining LaTeX commands', () => {
    const result = latexToSpeech('\\mathbf{F} = m\\mathbf{a}');
    expect(result).not.toContain('\\');
    expect(result).not.toContain('{');
    expect(result).not.toContain('}');
  });

  it('normalises multiple spaces into one', () => {
    expect(latexToSpeech('a  b   c')).toBe('a b c');
  });

  it('trims leading and trailing whitespace', () => {
    expect(latexToSpeech('  hello  ')).toBe('hello');
  });
});

// ── Full sentence examples ────────────────────────────────────────────────────

describe('latexToSpeech — full sentence examples', () => {
  it('problem-statement example: \\int x^2 dx', () => {
    const result = latexToSpeech('The answer is \\int x^2 dx.');
    expect(result).toContain('the integral of');
    expect(result).toContain('x squared');
    expect(result).toContain('with respect to x');
  });

  it('problem-statement example: \\frac{dy}{dx}', () => {
    const result = latexToSpeech('\\frac{dy}{dx} is the derivative notation.');
    expect(result).toContain('the derivative of y with respect to x');
  });

  it('friction coefficient mention', () => {
    const result = latexToSpeech('Have you reviewed the friction coefficients \\mu?');
    expect(result).toContain('mu');
    expect(result).not.toContain('\\');
  });
});
