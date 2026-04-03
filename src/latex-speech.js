/**
 * LaTeX → Spoken-English middleware.
 *
 * Converts common A-level mathematical LaTeX notation into natural spoken
 * English before it is displayed in the Jarvis transcript panel.
 *
 * Only a plain string is needed — no external dependencies.
 * Export is kept as a pure function so it can be unit-tested independently.
 *
 * @param {string} text  Raw text that may contain LaTeX fragments.
 * @returns {string}     Human-readable spoken form of the same text.
 */
export function latexToSpeech(text) {
  if (typeof text !== 'string') return text;

  let s = text;

  // ── Calculus ──────────────────────────────────────────────────────────────
  // \int_{a}^{b} expr dx  →  "the integral from a to b of expr with respect to x"
  s = s.replace(
    /\\int_\{([^}]*)\}\^?\{([^}]*)\}\s*([^\\]*?)\s*d([a-z])/g,
    (_m, lo, hi, expr, v) =>
      `the integral from ${lo.trim()} to ${hi.trim()} of ${expr.trim()} with respect to ${v}`
  );
  // \int expr dx  →  "the integral of expr with respect to x"
  s = s.replace(
    /\\int\s+([^\\]*?)\s+d([a-z])/g,
    (_m, expr, v) => `the integral of ${expr.trim()} with respect to ${v}`
  );
  // Bare \int
  s = s.replace(/\\int\b/g, 'the integral');

  // \frac{dy}{dx}  →  "the derivative of y with respect to x"
  s = s.replace(
    /\\frac\{d([^}]*)\}\{d([^}]*)\}/g,
    (_m, num, den) => `the derivative of ${num} with respect to ${den}`
  );
  // \frac{d^2y}{dx^2}  →  "the second derivative of y with respect to x"
  s = s.replace(
    /\\frac\{d\^2([^}]*)\}\{d([^}]*)\\?\^2\}/g,
    (_m, fn, v) => `the second derivative of ${fn} with respect to ${v}`
  );
  // \frac{numerator}{denominator}  →  "numerator over denominator"
  s = s.replace(
    /\\frac\{([^}]*)\}\{([^}]*)\}/g,
    (_m, num, den) => `${num.trim()} over ${den.trim()}`
  );

  // \lim_{x \to a}  →  "the limit as x approaches a"
  s = s.replace(
    /\\lim_\{([^}]*?)\\to\s*([^}]*)\}/g,
    (_m, v, a) => `the limit as ${v.trim()} approaches ${a.trim()}`
  );

  // \sum_{i=1}^{n}  →  "the sum from i equals 1 to n of"
  s = s.replace(
    /\\sum_\{([^}]*)\}\^\{([^}]*)\}/g,
    (_m, lo, hi) => `the sum from ${lo.trim()} to ${hi.trim()} of`
  );
  s = s.replace(/\\sum\b/g, 'the sum of');

  // \prod_{i=1}^{n}  →  "the product from i equals 1 to n of"
  s = s.replace(
    /\\prod_\{([^}]*)\}\^\{([^}]*)\}/g,
    (_m, lo, hi) => `the product from ${lo.trim()} to ${hi.trim()} of`
  );

  // ── Roots & powers ────────────────────────────────────────────────────────
  // \sqrt{expr}  →  "the square root of expr"
  s = s.replace(/\\sqrt\{([^}]*)\}/g, (_m, e) => `the square root of ${e.trim()}`);
  s = s.replace(/\\sqrt\b/g, 'the square root of');

  // x^{2} / x^2  →  "x squared" / "x cubed" / "x to the power n"
  s = s.replace(/([A-Za-z0-9])\^\{2\}/g, '$1 squared');
  s = s.replace(/([A-Za-z0-9])\^2\b/g, '$1 squared');
  s = s.replace(/([A-Za-z0-9])\^\{3\}/g, '$1 cubed');
  s = s.replace(/([A-Za-z0-9])\^3\b/g, '$1 cubed');
  s = s.replace(/([A-Za-z0-9])\^\{([^}]*)\}/g, '$1 to the power $2');
  s = s.replace(/([A-Za-z0-9])\^([A-Za-z0-9]+)/g, '$1 to the power $2');

  // _{n}  →  "subscript n"
  s = s.replace(/_\{([^}]*)\}/g, ' subscript $1');
  s = s.replace(/_([A-Za-z0-9])/g, ' subscript $1');

  // ── Trig & common functions ───────────────────────────────────────────────
  s = s.replace(/\\sin\b/g,    'sine');
  s = s.replace(/\\cos\b/g,    'cosine');
  s = s.replace(/\\tan\b/g,    'tangent');
  s = s.replace(/\\cot\b/g,    'cotangent');
  s = s.replace(/\\sec\b/g,    'secant');
  s = s.replace(/\\csc\b/g,    'cosecant');
  s = s.replace(/\\arcsin\b/g, 'arc sine');
  s = s.replace(/\\arccos\b/g, 'arc cosine');
  s = s.replace(/\\arctan\b/g, 'arc tangent');
  s = s.replace(/\\ln\b/g,     'the natural log of');
  s = s.replace(/\\log\b/g,    'log');
  s = s.replace(/\\exp\b/g,    'e to the power');

  // ── Greek letters ─────────────────────────────────────────────────────────
  s = s.replace(/\\alpha\b/g,   'alpha');
  s = s.replace(/\\beta\b/g,    'beta');
  s = s.replace(/\\gamma\b/g,   'gamma');
  s = s.replace(/\\delta\b/g,   'delta');
  s = s.replace(/\\epsilon\b/g, 'epsilon');
  s = s.replace(/\\zeta\b/g,    'zeta');
  s = s.replace(/\\eta\b/g,     'eta');
  s = s.replace(/\\theta\b/g,   'theta');
  s = s.replace(/\\lambda\b/g,  'lambda');
  s = s.replace(/\\mu\b/g,      'mu');
  s = s.replace(/\\nu\b/g,      'nu');
  s = s.replace(/\\xi\b/g,      'xi');
  s = s.replace(/\\pi\b/g,      'pi');
  s = s.replace(/\\rho\b/g,     'rho');
  s = s.replace(/\\sigma\b/g,   'sigma');
  s = s.replace(/\\tau\b/g,     'tau');
  s = s.replace(/\\phi\b/g,     'phi');
  s = s.replace(/\\chi\b/g,     'chi');
  s = s.replace(/\\psi\b/g,     'psi');
  s = s.replace(/\\omega\b/g,   'omega');

  // ── Operators & symbols ───────────────────────────────────────────────────
  s = s.replace(/\\pm\b/g,      'plus or minus');
  s = s.replace(/\\mp\b/g,      'minus or plus');
  s = s.replace(/\\times\b/g,   'times');
  s = s.replace(/\\div\b/g,     'divided by');
  s = s.replace(/\\cdot\b/g,    'times');
  s = s.replace(/\\leq\b/g,     'less than or equal to');
  s = s.replace(/\\geq\b/g,     'greater than or equal to');
  s = s.replace(/\\neq\b/g,     'not equal to');
  s = s.replace(/\\approx\b/g,  'approximately equal to');
  s = s.replace(/\\infty\b/g,   'infinity');
  s = s.replace(/\\to\b/g,      'approaches');
  s = s.replace(/\\rightarrow\b/g, 'becomes');
  s = s.replace(/\\Rightarrow\b/g, 'implies');
  s = s.replace(/\\iff\b/g,     'if and only if');
  s = s.replace(/\\forall\b/g,  'for all');
  s = s.replace(/\\exists\b/g,  'there exists');
  s = s.replace(/\\in\b/g,      'in');
  s = s.replace(/\\subset\b/g,  'is a subset of');
  s = s.replace(/\\cup\b/g,     'union');
  s = s.replace(/\\cap\b/g,     'intersection');

  // ── Absolute value / norms ────────────────────────────────────────────────
  s = s.replace(/\\left\|([^|]*?)\\right\|/g, 'the absolute value of $1');

  // ── Strip remaining \left \right wrappers ─────────────────────────────────
  s = s.replace(/\\left\s*[([{]/g, '');
  s = s.replace(/\\right\s*[)\]}]/g, '');

  // ── Strip remaining LaTeX commands and braces ────────────────────────────
  // Remove remaining \command tokens
  s = s.replace(/\\[A-Za-z]+/g, '');
  // Remove remaining bare braces
  s = s.replace(/[{}]/g, '');

  // ── Normalise whitespace ─────────────────────────────────────────────────
  s = s.replace(/\s{2,}/g, ' ').trim();

  return s;
}
