'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BookOpen, Calculator, Sigma, Sparkles } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'
import { calcClear, calcDelete, calcEquals, calcInput } from '@/src/calculator.js'

type FormulaTab = 'formulas' | 'calculator' | 'glossary' | 'command-words'

interface FormulaToolsClientProps {
  initialTab?: FormulaTab
}

type CalcState = { value: string; prev: string; op: string }

const FORMULAS = [
  {
    category: 'Pure 1',
    title: 'Product rule',
    expression: "(uv)' = u'v + uv'",
    tip: 'Use when two variable expressions are multiplied together.',
  },
  {
    category: 'Pure 1',
    title: 'Quotient rule',
    expression: "(u / v)' = (vu' − uv') / v²",
    tip: 'Useful when the denominator is also a function of x.',
  },
  {
    category: 'Pure 2',
    title: 'Integration by parts',
    expression: '∫u dv = uv − ∫v du',
    tip: 'Pick u so differentiating it makes the expression simpler.',
  },
  {
    category: 'Statistics',
    title: 'z-score',
    expression: 'z = (x − μ) / σ',
    tip: 'Convert raw values into standard deviations from the mean.',
  },
  {
    category: 'Mechanics',
    title: 'SUVAT',
    expression: 'v² = u² + 2as',
    tip: 'Use when time is not present in the data you are given.',
  },
  {
    category: 'Pure 2',
    title: 'Binomial expansion term',
    expression: 'T₍r+1₎ = ⁿCᵣ aⁿ⁻ʳbʳ',
    tip: 'Great for finding a specific term without expanding everything.',
  },
] as const

const GLOSSARY = [
  { term: 'Stationary point', meaning: 'A point where the gradient is zero.', example: 'Find by solving f\'(x)=0.' },
  { term: 'Concavity', meaning: 'Whether a graph bends upwards or downwards.', example: 'Check the sign of f\''\''(x).' },
  { term: 'Independent events', meaning: 'One event does not change the probability of the other.', example: 'P(A ∩ B)=P(A)P(B).' },
  { term: 'Resultant force', meaning: 'The single force equivalent to all forces acting together.', example: 'Sum horizontal and vertical components.' },
]

const COMMAND_WORDS = [
  { word: 'Show that', expectation: 'Prove the required result using full working and the exact target answer.', tip: 'Do not stop once you feel close — explicitly reach the given result.' },
  { word: 'Hence', expectation: 'Use the previous part directly to derive the next answer.', tip: 'Quote the earlier result and build from it.' },
  { word: 'Explain', expectation: 'Write the reasoning in words, not just algebra.', tip: 'State why each step is valid or what the result means.' },
  { word: 'Deduce', expectation: 'Infer the answer from information already established.', tip: 'Use earlier values or graphs rather than starting from scratch.' },
]

function nextQuizIndex(current: number) {
  return (current + 1) % FORMULAS.length
}

export default function FormulaToolsClient({ initialTab = 'formulas' }: FormulaToolsClientProps) {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<FormulaTab>(initialTab)
  const [search, setSearch] = useState('')
  const [quizIndex, setQuizIndex] = useState(0)
  const [showQuizAnswer, setShowQuizAnswer] = useState(false)
  const [calcState, setCalcState] = useState<CalcState>(() => calcClear())

  useEffect(() => {
    const requested = searchParams.get('tab')
    if (requested === 'calculator' || requested === 'glossary' || requested === 'command-words' || requested === 'formulas') {
      setTab(requested)
    }
  }, [searchParams])

  const filteredFormulas = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return FORMULAS
    return FORMULAS.filter(item =>
      item.category.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.expression.toLowerCase().includes(q),
    )
  }, [search])

  const filteredGlossary = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return GLOSSARY
    return GLOSSARY.filter(item =>
      item.term.toLowerCase().includes(q) ||
      item.meaning.toLowerCase().includes(q),
    )
  }, [search])

  const displayValue = calcState.value || calcState.prev || '0'
  const quizCard = FORMULAS[quizIndex]

  function press(val: string) {
    setCalcState(prev => calcInput(prev, val))
  }

  function solve() {
    setCalcState(prev => calcEquals(prev) as CalcState)
  }

  return (
    <AuthPageShell
      title="Reference Tools"
      subtitle="Formulas, glossary terms, command words, and a study calculator"
      action={
        <Link href="/study?tab=flashcards" className="px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#4F8CFF' }}>
          Open study hub →
        </Link>
      }
    >
      <div className="space-y-6 max-w-6xl">
        <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-primary font-medium">Migrated from the old dashboard</p>
              <h2 className="text-xl font-semibold text-foreground mt-1">Choose a reference tool</h2>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'formulas', label: 'Formulas', icon: Sigma },
                { id: 'glossary', label: 'Glossary', icon: BookOpen },
                { id: 'command-words', label: 'Command words', icon: Sparkles },
                { id: 'calculator', label: 'Calculator', icon: Calculator },
              ].map(item => {
                const Icon = item.icon
                const active = tab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id as FormulaTab)}
                    className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                    style={{
                      background: active ? 'rgba(79,140,255,0.14)' : 'rgba(255,255,255,0.04)',
                      color: active ? '#4F8CFF' : '#9AA4AF',
                      border: active ? '1px solid rgba(79,140,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {tab !== 'calculator' && (
          <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Search the library</h3>
                <p className="text-sm text-muted">Quick lookup for revision and exam technique.</p>
              </div>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search formulas, terms, or command words..."
                className="w-full md:w-80 px-3 py-2.5 rounded-[10px] text-sm text-foreground outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </section>
        )}

        {tab === 'formulas' && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-lg font-semibold text-foreground mb-4">Formula sheet</h3>
              <div className="space-y-3">
                {filteredFormulas.map(item => (
                  <div key={item.title} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-xs uppercase tracking-[0.14em] text-primary font-semibold mb-2">{item.category}</div>
                    <div className="text-sm font-semibold text-foreground mb-1">{item.title}</div>
                    <div className="text-lg text-white font-medium">{item.expression}</div>
                    <p className="text-xs text-muted mt-2">{item.tip}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-lg font-semibold text-foreground mb-2">Formula quiz</h3>
              <p className="text-sm text-muted mb-4">Test whether you can recognise the right formula under pressure.</p>
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="text-xs uppercase tracking-[0.14em] text-primary font-semibold mb-2">Prompt</div>
                <p className="text-sm text-foreground">When would you use <strong>{quizCard.title}</strong>?</p>
                {showQuizAnswer && (
                  <p className="text-sm text-muted mt-3">{quizCard.tip} Formula: <span className="text-foreground">{quizCard.expression}</span></p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap mt-4">
                <button onClick={() => setShowQuizAnswer(v => !v)} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ background: 'rgba(255,255,255,0.04)', color: '#E6EDF3', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {showQuizAnswer ? 'Hide answer' : 'Show answer'}
                </button>
                <button
                  onClick={() => {
                    setQuizIndex(current => nextQuizIndex(current))
                    setShowQuizAnswer(false)
                  }}
                  className="px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'rgba(79,140,255,0.12)', color: '#4F8CFF', border: '1px solid rgba(79,140,255,0.2)' }}
                >
                  Next prompt
                </button>
                <Link href={`/chat?q=${encodeURIComponent(`Teach me ${quizCard.title} with a worked example`)}`} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.18)' }}>
                  Ask Jarvis
                </Link>
              </div>
            </section>
          </div>
        )}

        {tab === 'glossary' && (
          <section className="rounded-card p-5 max-w-4xl" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Glossary</h3>
            <div className="space-y-3">
              {filteredGlossary.map(item => (
                <div key={item.term} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-sm font-semibold text-foreground">{item.term}</div>
                  <p className="text-sm text-muted mt-1">{item.meaning}</p>
                  <p className="text-xs text-primary mt-2">Example: {item.example}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'command-words' && (
          <section className="rounded-card p-5 max-w-4xl" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Command words guide</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {COMMAND_WORDS.map(item => (
                <div key={item.word} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-sm font-semibold text-foreground mb-1">{item.word}</div>
                  <p className="text-sm text-muted leading-6">{item.expectation}</p>
                  <p className="text-xs text-primary mt-2">Exam tip: {item.tip}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'calculator' && (
          <div className="grid gap-6 lg:grid-cols-[0.75fr_1.1fr]">
            <section className="rounded-card p-5 max-w-md" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-lg font-semibold text-foreground mb-4">Calculator</h3>
              <div className="rounded-xl p-4 mb-4 text-right" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xs text-muted mb-1">{calcState.prev} {calcState.op}</div>
                <div className="text-3xl font-black text-foreground">{displayValue}</div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+'].map(key => (
                  <button
                    key={key}
                    onClick={() => (key === '=' ? solve() : press(key))}
                    className="px-3 py-3 rounded-lg text-sm font-semibold"
                    style={{ background: 'rgba(255,255,255,0.04)', color: '#E6EDF3', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setCalcState(calcClear())} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>Clear</button>
                <button onClick={() => setCalcState(prev => calcDelete(prev))} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium" style={{ background: 'rgba(255,255,255,0.04)', color: '#E6EDF3' }}>Delete</button>
              </div>
            </section>

            <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-lg font-semibold text-foreground mb-2">Calculator study tips</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  'Write the operation before pressing equals so you keep the structure of your working clear.',
                  'Use Jarvis after each calculation to explain why the method works, not just what the answer is.',
                  'For calculus, combine this with the formula sheet tab to identify the right method first.',
                  'If a value looks unrealistic, check units and whether you should be in degrees or radians.',
                ].map(tip => (
                  <div key={tip} className="rounded-xl p-4 text-sm text-muted leading-6" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {tip}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </AuthPageShell>
  )
}
