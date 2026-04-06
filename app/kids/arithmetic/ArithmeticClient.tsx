'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Calculator, Play, Check, SkipForward } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { useAuth } from '@/lib/useAuth'
import { useRouter } from 'next/navigation'

type Question = { display: string; answer: string }
type Review   = { display: string; correct: boolean; userAns: string; right: string }

const LEVELS = [
  { value: 'ks1', label: 'KS1 — Ages 5–7' },
  { value: 'ks2', label: 'KS2 / SATs — Ages 7–11' },
  { value: 'ks3', label: 'KS3 — Ages 11–14' },
]
const OPS   = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'add',   label: 'Addition +' },
  { value: 'sub',   label: 'Subtraction −' },
  { value: 'mul',   label: 'Multiply ×' },
  { value: 'div',   label: 'Division ÷' },
]
const COUNTS = [5, 10, 20]

function genQ(level: string, ops: string): Question {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
  const op = ops === 'mixed' ? pick(['add','sub','mul','div']) : ops
  let a: number, b: number, answer: number, display: string
  if (level === 'ks1')       { a = Math.floor(Math.random()*10)+1; b = Math.floor(Math.random()*10)+1 }
  else if (level === 'ks2')  { a = Math.floor(Math.random()*50)+5; b = Math.floor(Math.random()*20)+2 }
  else                       { a = Math.floor(Math.random()*200)+10; b = Math.floor(Math.random()*50)+3 }
  if (op === 'add')      { answer = a+b; display = `${a} + ${b}` }
  else if (op === 'sub') { if(a<b)[a,b]=[b,a]; answer=a-b; display=`${a} − ${b}` }
  else if (op === 'mul') {
    if(level==='ks3'){a=Math.floor(Math.random()*25)+2;b=Math.floor(Math.random()*25)+2}
    else{a=Math.floor(Math.random()*12)+1;b=Math.floor(Math.random()*12)+1}
    answer=a*b; display=`${a} × ${b}`
  } else {
    b=Math.floor(Math.random()*11)+2; answer=Math.floor(Math.random()*20)+1; a=b*answer
    display=`${a} ÷ ${b}`
  }
  return { display: `${display} = ?`, answer: String(answer) }
}

const selectCls = 'bg-white/5 border border-white/10 text-white rounded-[10px] px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 cursor-pointer'

export default function ArithmeticClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [level, setLevel]   = useState('ks2')
  const [ops, setOps]       = useState('mixed')
  const [count, setCount]   = useState(10)
  const [phase, setPhase]   = useState<'setup'|'quiz'|'results'>('setup')
  const [questions, setQuestions] = useState<Question[]>([])
  const [idx, setIdx]       = useState(0)
  const [score, setScore]   = useState(0)
  const [ans, setAns]       = useState('')
  const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | null>(null)
  const [review, setReview] = useState<Review[]>([])
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!authLoading && !user) router.replace('/login') }, [authLoading, user, router])

  const stopTimer = useCallback(() => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  function startQuiz() {
    setQuestions(Array.from({ length: count }, () => genQ(level, ops)))
    setIdx(0); setScore(0); setReview([]); setAns(''); setFeedback(null); setElapsed(0)
    setPhase('quiz')
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function checkAnswer() {
    if (!ans.trim() || feedback) return
    const q = questions[idx]
    const correct = ans.trim() === q.answer
    setFeedback({ text: correct ? '✓ Correct!' : `✗ Answer: ${q.answer}`, correct })
    if (correct) setScore(s => s + 1)
    setReview(r => [...r, { display: q.display, correct, userAns: ans.trim(), right: q.answer }])
    setTimeout(() => {
      setFeedback(null); setAns('')
      if (idx + 1 >= questions.length) { stopTimer(); setPhase('results') }
      else { setIdx(i => i + 1); setTimeout(() => inputRef.current?.focus(), 50) }
    }, 900)
  }

  useEffect(() => () => stopTimer(), [stopTimer])

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  const pct = questions.length ? Math.round((score/questions.length)*100) : 0

  if (authLoading) return null

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-60">
        <Header title="Arithmetic & SATs" />
        <main className="flex-1 px-8 py-8 max-w-2xl">
          <div className="flex items-center gap-3 mb-1">
            <Calculator className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Arithmetic &amp; SATs</h1>
          </div>
          <p className="text-sm text-muted mb-8">Timed drills for KS1, KS2 / SATs, and KS3</p>

          {phase === 'setup' && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Level</label>
                  <select value={level} onChange={e => setLevel(e.target.value)} className={selectCls}>
                    {LEVELS.map(l => <option key={l.value} value={l.value} className="bg-[#0d1117]">{l.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Operations</label>
                  <select value={ops} onChange={e => setOps(e.target.value)} className={selectCls}>
                    {OPS.map(o => <option key={o.value} value={o.value} className="bg-[#0d1117]">{o.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Questions</label>
                  <select value={count} onChange={e => setCount(Number(e.target.value))} className={selectCls}>
                    {COUNTS.map(c => <option key={c} value={c} className="bg-[#0d1117]">{c} questions</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={startQuiz} className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg,#4F8CFF,#6C3EF4)' }}>
                    <Play className="w-4 h-4" /> Start Quiz
                  </button>
                </div>
              </div>
            </div>
          )}

          {phase === 'quiz' && (
            <div>
              <div className="flex justify-between text-sm text-muted mb-4">
                <span>Question {idx+1} of {questions.length}</span>
                <span className="text-primary font-semibold">Score: {score}</span>
                <span>⏱ {fmt(elapsed)}</span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-white/5 mb-6">
                <div className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(idx/questions.length)*100}%`, background: 'linear-gradient(90deg,#4F8CFF,#6C3EF4)' }} />
              </div>
              <div className="rounded-[16px] border border-primary/20 bg-primary/5 p-8 text-center">
                <p className="text-4xl font-bold text-foreground mb-6 tracking-wide">{questions[idx]?.display}</p>
                <div className="flex justify-center gap-3">
                  <input
                    ref={inputRef}
                    type="text" inputMode="decimal" value={ans}
                    onChange={e => setAns(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && checkAnswer()}
                    placeholder="Your answer"
                    className="w-36 text-center bg-white/5 border border-white/10 rounded-[10px] px-3 py-2.5 text-lg text-foreground focus:outline-none focus:border-primary/50"
                  />
                  <button onClick={checkAnswer}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg,#4F8CFF,#6C3EF4)' }}>
                    <Check className="w-4 h-4" /> Check
                  </button>
                </div>
                {feedback && (
                  <p className={`mt-4 font-semibold text-sm ${feedback.correct ? 'text-green-400' : 'text-red-400'}`}>
                    {feedback.text}
                  </p>
                )}
              </div>
            </div>
          )}

          {phase === 'results' && (
            <div className="rounded-[16px] border border-primary/20 bg-primary/5 p-8 text-center">
              <div className="text-4xl mb-2">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
              <h2 className="text-xl font-bold text-foreground mb-1">Quiz Complete!</h2>
              <p className="text-muted text-sm mb-1">You scored <span className="text-primary font-bold">{score}/{questions.length} ({pct}%)</span></p>
              <p className="text-muted text-xs mb-6">Time: {fmt(elapsed)}</p>
              <div className="text-left max-w-sm mx-auto mb-6 space-y-2">
                {review.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm border-b border-white/5 pb-2">
                    <span className={r.correct ? 'text-green-400' : 'text-red-400'}>{r.correct ? '✓' : '✗'}</span>
                    <span className="flex-1 text-foreground">{r.display}</span>
                    {!r.correct && <span className="text-muted text-xs">→ {r.right}</span>}
                  </div>
                ))}
              </div>
              <button onClick={startQuiz}
                className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-[10px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#4F8CFF,#6C3EF4)' }}>
                Try Again ↺
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
