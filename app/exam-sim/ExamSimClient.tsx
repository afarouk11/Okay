'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FileCheck2, PlayCircle } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'

interface SimQuestion {
  id: string
  topic: string
  marks: number
  prompt: string
  markScheme: string[]
}

const QUESTIONS: SimQuestion[] = [
  {
    id: 'sim-1',
    topic: 'Integration',
    marks: 4,
    prompt: 'Use integration by parts to evaluate ∫ x e^x dx.',
    markScheme: ['Choose u = x and dv = e^x dx', 'Differentiate/integrate correctly', 'Substitute into uv − ∫v du', 'Simplify to e^x(x − 1) + C'],
  },
  {
    id: 'sim-2',
    topic: 'Statistics',
    marks: 3,
    prompt: 'State the meaning of a 5% significance level in a hypothesis test.',
    markScheme: ['Mentions a 5% chance of rejecting a true null hypothesis', 'Links to Type I error', 'Uses probability language clearly'],
  },
  {
    id: 'sim-3',
    topic: 'Mechanics',
    marks: 5,
    prompt: 'A particle starts from rest and accelerates at 2.4 m/s² for 8 s. Find its speed and distance travelled.',
    markScheme: ['Use v = u + at', 'Use s = ut + 1/2 at²', 'Substitute u = 0 correctly', 'State v = 19.2 m/s', 'State s = 76.8 m'],
  },
]

const DURATION_SECONDS = 18 * 60

function formatClock(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const secs = (totalSeconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

export default function ExamSimClient() {
  const [running, setRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(DURATION_SECONDS)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [showMarkScheme, setShowMarkScheme] = useState<Record<string, boolean>>({})
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selfScores, setSelfScores] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(id)
          setRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(id)
  }, [running])

  const currentQuestion = QUESTIONS[questionIndex]
  const totalMarks = useMemo(() => QUESTIONS.reduce((sum, q) => sum + q.marks, 0), [])
  const earnedMarks = Object.values(selfScores).reduce((sum, score) => sum + score, 0)

  function resetSession() {
    setRunning(false)
    setTimeLeft(DURATION_SECONDS)
    setQuestionIndex(0)
    setShowMarkScheme({})
    setAnswers({})
    setSelfScores({})
  }

  return (
    <AuthPageShell
      title="Exam Simulator"
      subtitle="Run a short timed paper, then self-mark using the built-in scheme"
      action={
        <Link href="/questions" className="px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#4F8CFF' }}>
          More questions →
        </Link>
      }
    >
      <div className="space-y-6 max-w-6xl">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs uppercase tracking-[0.14em] text-primary font-semibold mb-2">Timer</div>
            <div className="text-4xl font-black text-foreground">{formatClock(timeLeft)}</div>
            <p className="text-sm text-muted mt-2">{running ? 'Timer running' : 'Ready when you are'}</p>
          </div>
          <div className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs uppercase tracking-[0.14em] text-primary font-semibold mb-2">Progress</div>
            <div className="text-4xl font-black text-foreground">{questionIndex + 1}/{QUESTIONS.length}</div>
            <p className="text-sm text-muted mt-2">Move through the mini-paper at exam pace.</p>
          </div>
          <div className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs uppercase tracking-[0.14em] text-primary font-semibold mb-2">Self-marked score</div>
            <div className="text-4xl font-black text-foreground">{earnedMarks}/{totalMarks}</div>
            <p className="text-sm text-muted mt-2">Award yourself marks after checking the scheme.</p>
          </div>
        </section>

        <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Mini exam paper</h2>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setRunning(value => !value)} className="px-3 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#4F8CFF' }}>
                {running ? 'Pause timer' : 'Start timer'}
              </button>
              <button onClick={resetSession} className="px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.04)', color: '#E6EDF3' }}>
                Reset
              </button>
            </div>
          </div>

          <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-primary font-semibold mb-1">{currentQuestion.topic}</div>
                <div className="text-lg font-semibold text-foreground">Question {questionIndex + 1}</div>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
                {currentQuestion.marks} marks
              </span>
            </div>

            <p className="text-sm text-foreground leading-6 mb-4">{currentQuestion.prompt}</p>

            <textarea
              value={answers[currentQuestion.id] ?? ''}
              onChange={e => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
              rows={8}
              placeholder="Write your answer or plan here..."
              className="w-full px-3 py-2.5 rounded-[10px] text-sm text-foreground outline-none"
              style={{ background: 'rgba(11,15,20,0.8)', border: '1px solid rgba(255,255,255,0.08)', lineHeight: 1.7 }}
            />

            <div className="flex gap-2 flex-wrap mt-4">
              <button
                onClick={() => setShowMarkScheme(prev => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }))}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#E6EDF3', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {showMarkScheme[currentQuestion.id] ? 'Hide mark scheme' : 'Show mark scheme'}
              </button>
              {questionIndex > 0 && (
                <button onClick={() => setQuestionIndex(index => Math.max(0, index - 1))} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ background: 'rgba(255,255,255,0.04)', color: '#E6EDF3' }}>
                  Previous
                </button>
              )}
              {questionIndex < QUESTIONS.length - 1 && (
                <button onClick={() => setQuestionIndex(index => Math.min(QUESTIONS.length - 1, index + 1))} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ background: 'rgba(79,140,255,0.12)', color: '#4F8CFF' }}>
                  Next question
                </button>
              )}
            </div>

            {showMarkScheme[currentQuestion.id] && (
              <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.16)' }}>
                <div className="text-sm font-semibold text-foreground mb-2">Mark scheme points</div>
                <ul className="space-y-2 text-sm text-muted">
                  {currentQuestion.markScheme.map(point => (
                    <li key={point}>• {point}</li>
                  ))}
                </ul>
                <div className="flex gap-2 flex-wrap mt-4">
                  {Array.from({ length: currentQuestion.marks + 1 }, (_, score) => score).map(score => (
                    <button
                      key={score}
                      onClick={() => setSelfScores(prev => ({ ...prev, [currentQuestion.id]: score }))}
                      className="px-3 py-2 rounded-lg text-sm font-medium"
                      style={{
                        background: selfScores[currentQuestion.id] === score ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.04)',
                        color: selfScores[currentQuestion.id] === score ? '#22C55E' : '#E6EDF3',
                        border: selfScores[currentQuestion.id] === score ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {score} / {currentQuestion.marks}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <PlayCircle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">After the simulation</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { href: '/predict', label: 'Review exam insights', desc: 'See whether your current performance is on track for your target grade.' },
              { href: '/study?tab=flashcards', label: 'Build flashcards', desc: 'Turn missed ideas into quick spaced-repetition prompts.' },
              { href: `/chat?q=${encodeURIComponent(`Help me review this topic: ${currentQuestion.topic}`)}`, label: 'Debrief with Jarvis', desc: 'Ask for a step-by-step review of the toughest question.' },
            ].map(item => (
              <Link key={item.href} href={item.href} className="rounded-xl p-4 block" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
