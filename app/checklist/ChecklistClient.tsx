'use client'

import { useEffect, useState } from 'react'
import { CheckSquare, RotateCcw } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'

type Status = 'not-started' | 'in-progress' | 'confident'

interface TopicItem {
  id: string
  chapter: string
  topic: string
  status: Status
}

const CURRICULUM: { chapter: string; topics: string[] }[] = [
  { chapter: 'Algebra & Functions', topics: ['Indices & surds', 'Quadratics', 'Simultaneous equations', 'Inequalities', 'Polynomials', 'Partial fractions', 'Functions & mappings', 'Transformations of graphs'] },
  { chapter: 'Coordinate Geometry', topics: ['Straight lines', 'Circles', 'Parametric equations'] },
  { chapter: 'Sequences & Series', topics: ['Arithmetic sequences', 'Geometric sequences', 'Sigma notation', 'Binomial expansion', 'Binomial series'] },
  { chapter: 'Trigonometry', topics: ['SOHCAHTOA', 'Sine & cosine rules', 'Radians', 'Small angle approximations', 'Trig identities', 'Inverse trig functions', 'Trig equations', 'Reciprocal trig functions', 'Addition formulae', 'Double angle formulae', 'Harmonic form'] },
  { chapter: 'Exponentials & Logarithms', topics: ['Exponential functions', 'Laws of logarithms', 'Natural logarithm', 'Solving exponential equations', 'Exponential models'] },
  { chapter: 'Differentiation', topics: ['Basic differentiation', 'Chain rule', 'Product rule', 'Quotient rule', 'Implicit differentiation', 'Parametric differentiation', 'Related rates of change', 'Second derivatives', 'Stationary points', 'Optimisation'] },
  { chapter: 'Integration', topics: ['Basic integration', 'Definite integrals', 'Area under a curve', 'Integration by substitution', 'Integration by parts', 'Partial fractions integration', 'Trapezium rule', 'Differential equations', 'Volumes of revolution'] },
  { chapter: 'Vectors', topics: ['2D vectors', '3D vectors', 'Magnitude & direction', 'Position vectors', 'Vector equations of lines', 'Scalar product'] },
  { chapter: 'Proof', topics: ['Proof by deduction', 'Proof by exhaustion', 'Disproof by counterexample', 'Proof by contradiction'] },
  { chapter: 'Statistics', topics: ['Sampling methods', 'Data presentation', 'Measures of location & spread', 'Probability', 'Statistical distributions', 'Binomial distribution', 'Normal distribution', 'Hypothesis testing', 'Correlation & regression'] },
  { chapter: 'Mechanics', topics: ['Kinematics (SUVAT)', 'Velocity–time graphs', 'Forces & Newton\'s laws', 'Friction', 'Projectile motion', 'Moments', 'Connected particles', 'Variable acceleration'] },
]

const STATUS_CONFIG: Record<Status, { label: string; colour: string; bg: string; border: string }> = {
  'not-started': { label: 'Not started', colour: '#6B7394', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
  'in-progress':  { label: 'In progress',  colour: '#FB923C', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.2)' },
  'confident':    { label: 'Confident ✓',  colour: '#22C55E', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.2)'  },
}

const NEXT_STATUS: Record<Status, Status> = {
  'not-started': 'in-progress',
  'in-progress':  'confident',
  'confident':    'not-started',
}

const STORAGE_KEY = 'synaptiq_checklist'

function buildInitial(): TopicItem[] {
  return CURRICULUM.flatMap(({ chapter, topics }) =>
    topics.map(topic => ({ id: `${chapter}::${topic}`, chapter, topic, status: 'not-started' as Status }))
  )
}

export default function ChecklistClient() {
  const [items, setItems] = useState<TopicItem[]>([])
  const [filter, setFilter] = useState<'all' | Status>('all')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const saved: Record<string, Status> = JSON.parse(stored)
        setItems(buildInitial().map(item => ({ ...item, status: saved[item.id] ?? 'not-started' })))
      } else {
        setItems(buildInitial())
      }
    } catch {
      setItems(buildInitial())
    }
  }, [])

  function cycle(id: string) {
    setItems(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, status: NEXT_STATUS[item.status] } : item
      )
      try {
        const map: Record<string, Status> = {}
        updated.forEach(item => { map[item.id] = item.status })
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
      } catch {}
      return updated
    })
  }

  function reset() {
    const fresh = buildInitial()
    setItems(fresh)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  const confident  = items.filter(i => i.status === 'confident').length
  const inProgress = items.filter(i => i.status === 'in-progress').length
  const pct = items.length > 0 ? Math.round((confident / items.length) * 100) : 0

  const visibleItems = filter === 'all' ? items : items.filter(i => i.status === filter)
  const chapters = Array.from(new Set(visibleItems.map(i => i.chapter)))

  return (
    <AuthPageShell
      title="Topic Checklist"
      subtitle="Track every A-Level Maths topic against the full specification"
      action={
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#6B7394', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      }
    >
      <div className="max-w-3xl space-y-5">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: '#6B7394' }}>
            <span>Overall coverage</span>
            <span style={{ color: '#C9A84C' }}>{pct}% confident · {inProgress} in progress</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#C9A84C,#F0D080)' }}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'not-started', 'in-progress', 'confident'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize"
              style={filter === f
                ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#6B7394', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {f === 'all' ? 'All' : STATUS_CONFIG[f as Status].label}
            </button>
          ))}
        </div>

        {/* Topics by chapter */}
        {chapters.map(chapter => {
          const chapterItems = visibleItems.filter(i => i.chapter === chapter)
          if (chapterItems.length === 0) return null
          return (
            <div key={chapter}>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6B7394' }}>{chapter}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {chapterItems.map(item => {
                  const cfg = STATUS_CONFIG[item.status]
                  return (
                    <button
                      key={item.id}
                      onClick={() => cycle(item.id)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm transition-all"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                    >
                      <span className="text-foreground">{item.topic}</span>
                      <span className="text-xs ml-3 flex-shrink-0" style={{ color: cfg.colour }}>
                        {cfg.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {visibleItems.length === 0 && (
          <div className="text-center py-12" style={{ color: '#6B7394' }}>
            <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">All topics marked confident!</p>
          </div>
        )}
      </div>
    </AuthPageShell>
  )
}
