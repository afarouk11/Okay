'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, PenSquare, Sparkles } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'

interface CriterionScore {
  label: string
  score: number
  note: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function analyseWorking(question: string, answer: string) {
  const text = answer.trim()
  const lines = text.split(/\n+/).filter(Boolean)
  const lower = text.toLowerCase()
  const stepSignals = ['=', 'therefore', 'hence', 'because', 'so', '∫', 'd/dx', '=>']
  const signalCount = stepSignals.reduce((sum, token) => sum + (lower.includes(token) ? 1 : 0), 0)

  const criteria: CriterionScore[] = [
    {
      label: 'Method shown',
      score: clamp((lines.length >= 3 ? 3 : lines.length >= 2 ? 2 : 1) + (signalCount >= 2 ? 1 : 0), 1, 5),
      note: lines.length >= 3 ? 'Your working is broken into recognisable steps.' : 'Add one or two more intermediate steps.',
    },
    {
      label: 'Mathematical communication',
      score: clamp((/[=∫^√]/.test(text) ? 3 : 1) + (text.length > 80 ? 1 : 0), 1, 5),
      note: /[=∫^√]/.test(text) ? 'Good use of notation and symbolic working.' : 'Include more formal notation and equations.',
    },
    {
      label: 'Explanation quality',
      score: clamp((/(therefore|because|hence|so)/.test(lower) ? 3 : 1) + (question.trim() ? 1 : 0), 1, 5),
      note: /(therefore|because|hence|so)/.test(lower) ? 'You explain why the steps follow.' : 'Briefly justify the reasoning between steps.',
    },
  ]

  const total = Math.round((criteria.reduce((sum, item) => sum + item.score, 0) / (criteria.length * 5)) * 100)
  const band = total >= 85 ? 'A / A*' : total >= 70 ? 'B' : total >= 55 ? 'C' : 'Needs revision'

  const feedback = [
    total >= 70 ? 'Method marks look well protected.' : 'Add more explicit method steps so examiners can award working marks.',
    signalCount >= 2 ? 'Your structure is clear and readable.' : 'Use connectives like “hence” or “therefore” to show logic clearly.',
    question.trim() ? `Keep referring back to what the question asked: ${question.slice(0, 70)}${question.length > 70 ? '…' : ''}` : 'Paste the exact question next time for more precise feedback.',
  ]

  return { total, band, criteria, feedback }
}

export default function WorkCheckerPageClient() {
  const [board, setBoard] = useState('AQA')
  const [question, setQuestion] = useState('Solve the equation x² - 5x + 6 = 0 and show full working.')
  const [answer, setAnswer] = useState('x² - 5x + 6 = 0\n(x - 2)(x - 3) = 0\nTherefore x = 2 or x = 3')
  const [checked, setChecked] = useState(false)

  const result = useMemo(() => analyseWorking(question, answer), [question, answer])

  return (
    <AuthPageShell
      title="Work Checker"
      subtitle="Paste your working and get fast structure-focused feedback"
      action={
        <Link href="/chat" className="px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#4F8CFF' }}>
          Ask Jarvis →
        </Link>
      }
    >
      <div className="space-y-6 max-w-6xl">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-4">
              <PenSquare className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Paste your answer</h2>
            </div>

            <div className="space-y-3">
              <select
                value={board}
                onChange={e => setBoard(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[10px] text-sm text-foreground outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <option>AQA</option>
                <option>Edexcel</option>
                <option>OCR</option>
                <option>WJEC</option>
              </select>
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                rows={3}
                placeholder="Paste the exam question"
                className="w-full px-3 py-2.5 rounded-[10px] text-sm text-foreground outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                rows={10}
                placeholder="Write or paste your full working here"
                className="w-full px-3 py-2.5 rounded-[10px] text-sm text-foreground outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', lineHeight: 1.7 }}
              />
              <button
                onClick={() => setChecked(true)}
                className="px-4 py-2.5 rounded-[10px] text-sm font-semibold text-white"
                style={{ background: '#4F8CFF' }}
              >
                Check my working
              </button>
            </div>
          </div>

          <div className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Feedback snapshot</h2>
            </div>

            {checked ? (
              <div className="space-y-4">
                <div className="rounded-xl p-4" style={{ background: 'rgba(79,140,255,0.08)', border: '1px solid rgba(79,140,255,0.18)' }}>
                  <div className="text-xs uppercase tracking-[0.14em] text-primary font-semibold mb-2">{board} style estimate</div>
                  <div className="text-3xl font-black text-foreground">{result.band}</div>
                  <p className="text-sm text-muted mt-2">Structure score: {result.total}/100</p>
                </div>

                <div className="space-y-3">
                  {result.criteria.map(item => (
                    <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-sm font-semibold text-foreground">{item.label}</span>
                        <span className="text-xs text-primary">{item.score}/5</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ width: `${item.score * 20}%`, height: '100%', background: 'linear-gradient(90deg,#4F8CFF,#22C55E)' }} />
                      </div>
                      <p className="text-xs text-muted mt-2">{item.note}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-sm font-semibold text-foreground mb-2">Next improvements</div>
                  <ul className="space-y-2 text-sm text-muted">
                    {result.feedback.map(point => (
                      <li key={point}>• {point}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-5 text-sm text-muted leading-6" style={{ background: 'rgba(255,255,255,0.03)' }}>
                Paste your working and press <strong className="text-foreground">Check my working</strong> to see a quick structure-based review.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">How to turn this into full marks</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { href: '/formulas?tab=command-words', label: 'Review command words', desc: 'Match your explanation style to what the question asks.' },
              { href: '/study?tab=flashcards', label: 'Turn errors into flashcards', desc: 'Save recurring mistakes and revise them with spaced repetition.' },
              { href: '/questions', label: 'Try another question', desc: 'Re-test the same skill with a fresh exam-style prompt.' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl p-4 block"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="text-sm font-semibold text-foreground mb-1">{item.label}</div>
                <p className="text-xs text-muted leading-5">{item.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AuthPageShell>
  )
}
