'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Brain, Play, Loader2, SkipForward, StopCircle } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { useAuth } from '@/lib/useAuth'
import { useRouter } from 'next/navigation'

type IqQuestion = {
  type: string
  question: string
  options: string[]
  answer: 'A' | 'B' | 'C' | 'D'
  explanation: string
}
type ReviewItem = { q: IqQuestion; selected: string; correct: boolean; skipped?: boolean }

const TYPES = [
  { value: 'mixed',   label: 'Daily Mix (Recommended)' },
  { value: 'pattern', label: 'Pattern Sequences' },
  { value: 'number',  label: 'Number Series' },
  { value: 'verbal',  label: 'Verbal Analogies' },
  { value: 'spatial', label: 'Spatial Reasoning' },
  { value: 'logic',   label: 'Logic Puzzles' },
]
const DIFFS = [
  { value: 'junior',   label: 'Junior (Child-friendly)' },
  { value: 'standard', label: 'Standard' },
  { value: 'advanced', label: 'Advanced' },
]

const OPTIONS = ['A', 'B', 'C', 'D'] as const
const selectCls = 'bg-white/5 border border-white/10 text-white rounded-[10px] px-3 py-2.5 text-sm focus:outline-none cursor-pointer'

export default function NeuroClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [exerciseType, setExerciseType] = useState('mixed')
  const [difficulty, setDifficulty]     = useState('standard')
  const [phase, setPhase] = useState<'setup' | 'loading' | 'session' | 'results'>('setup')
  const [questions, setQuestions] = useState<IqQuestion[]>([])
  const [idx, setIdx]     = useState(0)
  const [score, setScore] = useState(0)
  const [review, setReview] = useState<ReviewItem[]>([])
  const [feedback, setFeedback] = useState<{ text: string; correct: boolean; expl: string } | null>(null)
  const [disabled, setDisabled] = useState(false)
  const [error, setError] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(600)
  const [elapsed, setElapsed]         = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { if (!authLoading && !user) router.replace('/login') }, [authLoading, user, router])

  const stopTimer = useCallback(() => { if (timerRef.current) clearInterval(timerRef.current) }, [])
  useEffect(() => () => stopTimer(), [stopTimer])

  async function startSession() {
    setPhase('loading'); setError('')
    try {
      const res = await fetch('/api/generate-iq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseType, difficulty }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Generation failed')
      setQuestions(data.questions)
      setIdx(0); setScore(0); setReview([]); setSecondsLeft(600); setElapsed(0)
      setFeedback(null); setDisabled(false)
      setPhase('session')
      timerRef.current = setInterval(() => {
        setElapsed(e => e + 1)
        setSecondsLeft(s => {
          if (s <= 1) { stopTimer(); setPhase('results'); return 0 }
          return s - 1
        })
      }, 1000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setPhase('setup')
    }
  }

  function advance(nextIdx: number) {
    setFeedback(null); setDisabled(false)
    if (nextIdx >= questions.length) { stopTimer(); setPhase('results') }
    else setIdx(nextIdx)
  }

  function answer(selected: string) {
    if (disabled) return
    setDisabled(true)
    const q = questions[idx]
    const correct = selected === q.answer
    if (correct) setScore(s => s + 1)
    setFeedback({ text: correct ? '✓ Correct!' : `✗ Answer: ${q.answer}`, correct, expl: q.explanation })
    setReview(r => [...r, { q, selected, correct }])
    setTimeout(() => advance(idx + 1), 1800)
  }

  function skip() {
    const q = questions[idx]
    setReview(r => [...r, { q, selected: '—', correct: false, skipped: true }])
    advance(idx + 1)
  }

  function endSession() { stopTimer(); setPhase('results') }

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0

  if (authLoading) return null

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-60">
        <Header title="Neuroplasticity" />
        <main className="flex-1 px-8 py-8 max-w-2xl">
          <div className="flex items-center gap-3 mb-1">
            <Brain className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Neuroplasticity</h1>
          </div>
          <p className="text-sm text-muted mb-8">Daily 10-minute brain-training to build cognitive flexibility and working memory</p>

          {phase === 'setup' && (
            <div className="space-y-6">
              {error && <p className="text-sm text-red-400">{error}</p>}
              {/* Intro cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
                {[
                  { icon: '🔢', title: 'Working Memory', desc: 'Number series that stretch short-term capacity' },
                  { icon: '🔷', title: 'Pattern Recognition', desc: 'Find structure — a core neuroplasticity driver' },
                  { icon: '💬', title: 'Verbal Fluency', desc: 'Analogies that strengthen prefrontal pathways' },
                  { icon: '🧩', title: 'Cognitive Flexibility', desc: 'Logic tasks that train rule-switching' },
                  { icon: '⏱', title: '10 Min Daily', desc: 'Designed to fit into a morning routine' },
                ].map(c => (
                  <div key={c.title} className="rounded-[12px] border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-2xl mb-1">{c.icon}</div>
                    <div className="text-sm font-semibold text-foreground mb-0.5">{c.title}</div>
                    <div className="text-xs text-muted">{c.desc}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Exercise Type</label>
                  <select value={exerciseType} onChange={e => setExerciseType(e.target.value)} className={selectCls}>
                    {TYPES.map(t => <option key={t.value} value={t.value} className="bg-[#0d1117]">{t.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Difficulty</label>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className={selectCls}>
                    {DIFFS.map(d => <option key={d.value} value={d.value} className="bg-[#0d1117]">{d.label}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={startSession}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg,#4F8CFF,#6C3EF4)' }}>
                    <Play className="w-4 h-4" /> Start Daily Session
                  </button>
                </div>
              </div>
            </div>
          )}

          {phase === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-16 text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Generating your personalised session…</p>
            </div>
          )}

          {phase === 'session' && questions[idx] && (
            <div>
              <div className="flex justify-between text-sm text-muted mb-3">
                <span>Exercise {idx+1} of {questions.length}</span>
                <span className="text-primary font-semibold">Score: {score}</span>
                <span>⏱ {fmt(secondsLeft)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 mb-5">
                <div className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(idx/questions.length)*100}%`, background: 'linear-gradient(90deg,#6C3EF4,#4F8CFF)' }} />
              </div>
              <div className="rounded-[16px] border border-primary/20 bg-primary/5 p-6 mb-4">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{questions[idx].type} Exercise</span>
                <p className="text-foreground text-[15px] leading-relaxed mt-3 mb-5 whitespace-pre-wrap">{questions[idx].question}</p>
                <div className="space-y-2">
                  {questions[idx].options.map((opt, i) => {
                    const letter = OPTIONS[i]
                    return (
                      <button key={letter} onClick={() => answer(letter)} disabled={disabled}
                        className="w-full text-left px-4 py-3 rounded-[10px] border border-white/10 bg-white/[0.02] text-sm text-foreground hover:bg-white/[0.06] hover:border-white/20 disabled:cursor-default transition-all">
                        {opt}
                      </button>
                    )
                  })}
                </div>
                {feedback && (
                  <div className="mt-4">
                    <p className={`font-semibold text-sm ${feedback.correct ? 'text-green-400' : 'text-red-400'}`}>{feedback.text}</p>
                    {feedback.expl && <p className="text-xs text-muted mt-1">{feedback.expl}</p>}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={skip} className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm border border-white/10 text-muted hover:text-foreground hover:border-white/20 transition-all">
                  <SkipForward className="w-3.5 h-3.5" /> Skip
                </button>
                <button onClick={endSession} className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm border border-red-500/20 text-red-400 hover:bg-red-500/5 transition-all">
                  <StopCircle className="w-3.5 h-3.5" /> End Session
                </button>
              </div>
            </div>
          )}

          {phase === 'results' && (
            <div className="rounded-[16px] border border-primary/20 bg-primary/5 p-8 text-center">
              <div className="text-4xl mb-2">{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'}</div>
              <h2 className="text-xl font-bold text-foreground mb-1">Session Complete!</h2>
              <p className="text-muted text-sm mb-0.5">Score: <span className="text-primary font-bold">{score}/{questions.length} ({pct}%)</span></p>
              <p className="text-muted text-xs mb-6">Time: {fmt(elapsed)}</p>
              <div className="text-left max-w-md mx-auto mb-6 max-h-72 overflow-y-auto space-y-3">
                {review.map((r, i) => (
                  <div key={i} className="border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={r.correct ? 'text-green-400' : 'text-red-400'}>{r.correct ? '✓' : '✗'}</span>
                      <span className="text-[10px] text-muted bg-white/5 px-2 py-0.5 rounded">{r.q.type}</span>
                      <span className="text-foreground flex-1 truncate">{r.q.question.slice(0, 60)}{r.q.question.length > 60 ? '…' : ''}</span>
                    </div>
                    {!r.correct && (
                      <p className="text-xs text-muted mt-1 pl-5">
                        {r.skipped ? 'Skipped — ' : `You: ${r.selected} · `}Correct: {r.q.answer}
                        {r.q.explanation ? ` — ${r.q.explanation}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={startSession}
                className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-[10px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#4F8CFF,#6C3EF4)' }}>
                New Session ↺
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
