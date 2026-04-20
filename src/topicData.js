/**
 * A-Level Maths topic difficulty tiers.
 *
 * Difficulty ratings are derived from:
 *   • AQA/Edexcel/OCR examiner reports (recurring loss-of-marks sections)
 *   • Ofqual A-level subject content ordering & assessment objectives
 *   • UK curriculum structure (topics introduced later = typically harder)
 *
 * These are curriculum-informed difficulty estimates, NOT national accuracy statistics.
 * difficulty: 1 (accessible) → 5 (most demanding)
 * module: Pure | Statistics | Mechanics
 * year: 12 | 13 | 'both'
 */

export const ALEVEL_TOPICS = [
  // ── Pure ──────────────────────────────────────────────────────────────────
  { topic: 'Algebra & Functions',           module: 'Pure',       year: 12,   difficulty: 1, tags: ['indices','surds','polynomials'] },
  { topic: 'Coordinate Geometry',           module: 'Pure',       year: 12,   difficulty: 1, tags: ['circles','lines','gradients'] },
  { topic: 'Sequences & Series',            module: 'Pure',       year: 12,   difficulty: 2, tags: ['arithmetic','geometric','sigma'] },
  { topic: 'Trigonometry',                  module: 'Pure',       year: 12,   difficulty: 2, tags: ['radians','identities','solving'] },
  { topic: 'Exponentials & Logarithms',     module: 'Pure',       year: 12,   difficulty: 2, tags: ['laws','natural log','modelling'] },
  { topic: 'Differentiation (Basic)',       module: 'Pure',       year: 12,   difficulty: 2, tags: ['chain rule','product','quotient'] },
  { topic: 'Integration (Basic)',           module: 'Pure',       year: 12,   difficulty: 2, tags: ['indefinite','definite','area'] },
  { topic: 'Numerical Methods',             module: 'Pure',       year: 12,   difficulty: 2, tags: ['bisection','iteration','sign change'] },
  { topic: 'Proof',                         module: 'Pure',       year: 'both', difficulty: 3, tags: ['deduction','counter-example','disproof'] },
  { topic: 'Binomial Expansion',            module: 'Pure',       year: 12,   difficulty: 3, tags: ['Pascal','general term','approximation'] },
  { topic: 'Vectors (2D)',                  module: 'Pure',       year: 12,   difficulty: 2, tags: ['column vectors','magnitude','unit'] },
  { topic: 'Functions & Transformations',   module: 'Pure',       year: 13,   difficulty: 2, tags: ['inverse','composite','modulus'] },
  { topic: 'Trigonometry (Advanced)',       module: 'Pure',       year: 13,   difficulty: 3, tags: ['R sin(x+a)','small angles','sec csc cot'] },
  { topic: 'Parametric Equations',          module: 'Pure',       year: 13,   difficulty: 4, tags: ['curves','conversion','differentiation'] },
  { topic: 'Differentiation (Advanced)',    module: 'Pure',       year: 13,   difficulty: 3, tags: ['implicit','related rates','ln|f(x)|'] },
  { topic: 'Integration (Advanced)',        module: 'Pure',       year: 13,   difficulty: 4, tags: ['by parts','substitution','partial fractions'] },
  { topic: 'Differential Equations',        module: 'Pure',       year: 13,   difficulty: 5, tags: ['separable','formation','modelling'] },
  { topic: 'Vectors (3D)',                  module: 'Pure',       year: 13,   difficulty: 4, tags: ['lines','planes','dot product'] },
  { topic: 'Proof by Contradiction',        module: 'Pure',       year: 13,   difficulty: 4, tags: ['irrational numbers','infinite primes'] },
  { topic: 'Partial Fractions',             module: 'Pure',       year: 13,   difficulty: 3, tags: ['decomposition','repeated factors'] },
  { topic: 'Binomial Expansion (Advanced)', module: 'Pure',       year: 13,   difficulty: 4, tags: ['fractional powers','negative n','validity'] },

  // ── Statistics ───────────────────────────────────────────────────────────
  { topic: 'Statistical Sampling',          module: 'Statistics', year: 12,   difficulty: 1, tags: ['random','stratified','systematic'] },
  { topic: 'Data Presentation',             module: 'Statistics', year: 12,   difficulty: 1, tags: ['histograms','box plots','outliers'] },
  { topic: 'Probability',                   module: 'Statistics', year: 12,   difficulty: 2, tags: ['tree diagrams','Venn','conditional'] },
  { topic: 'Binomial Distribution',         module: 'Statistics', year: 12,   difficulty: 2, tags: ['P(X=r)','cumulative','modelling'] },
  { topic: 'Normal Distribution',           module: 'Statistics', year: 13,   difficulty: 3, tags: ['standardising','inverse normal','approximation'] },
  { topic: 'Hypothesis Testing',            module: 'Statistics', year: 'both', difficulty: 4, tags: ['critical region','p-value','interpretation'] },
  { topic: 'Correlation & Regression',      module: 'Statistics', year: 12,   difficulty: 2, tags: ['PMCC','regression line','interpolation'] },
  { topic: 'Conditional Probability',       module: 'Statistics', year: 13,   difficulty: 3, tags: ['Bayes','independence','formulae'] },

  // ── Mechanics ────────────────────────────────────────────────────────────
  { topic: 'Kinematics (SUVAT)',            module: 'Mechanics',  year: 12,   difficulty: 2, tags: ['equations of motion','graphs','projectiles'] },
  { topic: 'Forces & Newton\'s Laws',       module: 'Mechanics',  year: 12,   difficulty: 2, tags: ['equilibrium','F=ma','friction'] },
  { topic: 'Moments',                       module: 'Mechanics',  year: 12,   difficulty: 3, tags: ['turning effect','equilibrium','rods'] },
  { topic: 'Projectiles',                   module: 'Mechanics',  year: 12,   difficulty: 3, tags: ['horizontal','vertical','range'] },
  { topic: 'Kinematics (Calculus)',         module: 'Mechanics',  year: 13,   difficulty: 3, tags: ['v=dx/dt','variable acceleration','integration'] },
  { topic: 'Forces (Inclined Planes)',      module: 'Mechanics',  year: 13,   difficulty: 3, tags: ['resolved components','friction coefficient'] },
]

/**
 * Topic difficulty bands.
 *   1-2  Accessible / Foundation
 *   3    Intermediate
 *   4-5  Challenging / Examiner-reported high mark-loss areas
 */
export const DIFFICULTY_LABELS = {
  1: 'Accessible',
  2: 'Foundation',
  3: 'Intermediate',
  4: 'Challenging',
  5: 'High difficulty',
}

/**
 * Topics in the curriculum's top difficulty tier (4-5).
 * These are the areas where examiner reports consistently note mark loss.
 * Source: AQA/Edexcel annual examiner reports on A-level Maths.
 */
export const HIGH_DIFFICULTY_TOPICS = ALEVEL_TOPICS
  .filter(t => t.difficulty >= 4)
  .map(t => t.topic)

/**
 * Look up difficulty metadata for a topic string (case-insensitive partial match).
 * @param {string} topicName
 * @returns {Object|null}
 */
export function getTopicMeta(topicName) {
  const lower = topicName.toLowerCase()
  return ALEVEL_TOPICS.find(t => t.topic.toLowerCase().includes(lower)
    || lower.includes(t.topic.toLowerCase().split(' ')[0].toLowerCase())
  ) ?? null
}

/**
 * Given a list of user topic stats, annotate each with curriculum difficulty.
 * @param {Array<{topic: string, accuracy: number, attempts: number}>} userTopics
 * @returns {Array<{topic: string, accuracy: number, attempts: number, difficulty: number|null, module: string|null}>}
 */
export function annotateWithDifficulty(userTopics) {
  return userTopics.map(ut => {
    const meta = getTopicMeta(ut.topic)
    return { ...ut, difficulty: meta?.difficulty ?? null, module: meta?.module ?? null }
  })
}
