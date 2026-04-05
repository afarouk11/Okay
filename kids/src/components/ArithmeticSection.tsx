'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type Level = 'ks1' | 'ks2' | 'ks3'
type Op = 'mixed' | 'add' | 'sub' | 'mul' | 'div'
type Phase = 'setup' | 'quiz' | 'results'

interface ArithQuestion {
  display: string
  answer: string
}

interface ReviewItem {
  question: string
  correct: boolean
  userAnswer: string
  rightAnswer: string
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px',
  padding: '24px',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
  cursor: 'pointer',
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.45)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.8px',
  marginBottom: '8px',
  display: 'block',
}

function genQuestion(level: Level, ops: Op): ArithQuestion {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
  const opList: Exclude<Op, 'mixed'>[] =
    ops === 'mixed' ? ['add', 'sub', 'mul', 'div'] : [ops]
  const op = pick(opList)

  let a: number, b: number, answer: number, display: string

  if (level === 'ks1') {
    a = Math.floor(Math.random() * 10) + 1
    b = Math.floor(Math.random() * 10) + 1
  } else if (level === 'ks2') {
    a = Math.floor(Math.random() * 50) + 5
    b = Math.floor(Math.random() * 20) + 2
  } else {
    a = Math.floor(Math.random() * 200) + 10
    b = Math.floor(Math.random() * 50) + 3
  }

  if (op === 'add') {
    answer = a + b
    display = `${a} + ${b} = ?`
  } else if (op === 'sub') {
    if (a < b) [a, b] = [b, a]
    answer = a - b
    display = `${a} − ${b} = ?`
  } else if (op === 'mul') {
    if (level === 'ks3') {
      a = Math.floor(Math.random() * 25) + 2
      b = Math.floor(Math.random() * 25) + 2
    } else {
      a = Math.floor(Math.random() * 12) + 1
      b = Math.floor(Math.random() * 12) + 1
    }
    answer = a * b
    display = `${a} × ${b} = ?`
  } else {
    b = Math.floor(Math.random() * 11) + 2
    answer = Math.floor(Math.random() * 20) + 1
    a = b * answer
    display = `${a} ÷ ${b} = ?`
  }

  return { display, answer: String(answer) }
}

export default function ArithmeticSection() {
  const [level, setLevel] = useState<Level>('ks3')
  const [ops, setOps] = useState<Op>('mixed')
  const [count, setCount] = useState(10)
  const [phase, setPhase] = useState<Phase>('setup')

  const [questions, setQuestions] = useState<ArithQuestion[]>([])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | null>(null)
  const [review, setReview] = useState<ReviewItem[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [advancing, setAdvancing] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => () => stopTimer(), [stopTimer])

  function startQuiz() {
    const qs = Array.from({ length: count }, () => genQuestion(level, ops))
    setQuestions(qs)
    setIdx(0)
    setScore(0)
    setReview([])
    setElapsed(0)
    setFeedback(null)
    setUserAnswer('')
    setAdvancing(false)
    setPhase('quiz')

    stopTimer()
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  function check() {
    if (advancing || !userAnswer.trim()) return
    const q = questions[idx]
    const correct = userAnswer.trim() === q.answer
    setFeedback({ text: correct ? '✓ Correct!' : `✗ Answer: ${q.answer}`, correct })
    if (correct) setScore((s) => s + 1)
    setReview((r) => [...r, { question: q.display, correct, userAnswer: userAnswer.trim(), rightAnswer: q.answer }])
    setAdvancing(true)

    setTimeout(() => {
      setAdvancing(false)
      setFeedback(null)
      setUserAnswer('')
      const next = idx + 1
      if (next >= questions.length) {
        stopTimer()
        setPhase('results')
      } else {
        setIdx(next)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }, 900)
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0
  const progress = questions.length ? ((idx) / questions.length) * 100 : 0

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div style={{ padding: '40px 48px', maxWidth: '860px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '28px' }}>🔢</span>
            <h1 style={{ fontSize: '28px', fontWeight: 700, background: 'linear-gradient(135deg, #00D4FF, #7B40FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
              Arithmetic Practice
            </h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: '15px' }}>
            Timed maths drills for KS1, KS2 and KS3 — all questions generated locally, no API needed
          </p>
        </div>

        <div style={{ ...cardStyle, marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={labelStyle}>Level</label>
              <select value={level} onChange={(e) => setLevel(e.target.value as Level)} style={selectStyle}>
                <option value="ks1">KS1 — Ages 5–7</option>
                <option value="ks2">KS2 — Ages 7–11</option>
                <option value="ks3">KS3 — Ages 11–14</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Operations</label>
              <select value={ops} onChange={(e) => setOps(e.target.value as Op)} style={selectStyle}>
                <option value="mixed">Mixed (All)</option>
                <option value="add">Addition (+)</option>
                <option value="sub">Subtraction (−)</option>
                <option value="mul">Multiplication (×)</option>
                <option value="div">Division (÷)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Questions</label>
              <select value={count} onChange={(e) => setCount(Number(e.target.value))} style={selectStyle}>
                <option value={5}>5 questions</option>
                <option value={10}>10 questions</option>
                <option value={20}>20 questions</option>
              </select>
            </div>
          </div>

          <button
            onClick={startQuiz}
            style={{ background: 'linear-gradient(135deg, #00D4FF, #7B40FF)', border: 'none', borderRadius: '10px', padding: '12px 28px', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
          >
            ▶ Start Quiz
          </button>
        </div>

        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
          {[
            { icon: '➕', label: 'Addition', desc: 'Building blocks of arithmetic' },
            { icon: '➖', label: 'Subtraction', desc: 'Finding differences and remainders' },
            { icon: '✖️', label: 'Multiplication', desc: 'Times tables up to 25×25 at KS3' },
            { icon: '➗', label: 'Division', desc: 'Exact integer division problems' },
          ].map((c) => (
            <div key={c.label} style={{ ...cardStyle, padding: '16px' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{c.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{c.label}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Quiz ───────────────────────────────────────────────────────────────────
  if (phase === 'quiz') {
    return (
      <div style={{ padding: '40px 48px', maxWidth: '640px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>
            Question <strong style={{ color: '#fff' }}>{idx + 1}</strong> of {questions.length}
          </div>
          <div style={{ fontSize: '14px', color: '#C9A84C', fontWeight: 600 }}>
            Score: {score}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>⏱ {fmt(elapsed)}</div>
        </div>

        {/* Progress bar */}
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '99px', height: '6px', marginBottom: '24px' }}>
          <div style={{ background: 'linear-gradient(90deg, #00D4FF, #7B40FF)', height: '6px', borderRadius: '99px', width: `${progress}%`, transition: 'width 0.4s ease' }} />
        </div>

        {/* Question */}
        <div style={{ ...cardStyle, borderLeft: '3px solid #00D4FF', textAlign: 'center', padding: '48px 32px', marginBottom: '20px' }}>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: '#fff', marginBottom: '32px', letterSpacing: '0.02em' }}>
            {questions[idx]?.display}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              placeholder="Your answer"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') check() }}
              disabled={advancing}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${feedback ? (feedback.correct ? '#4ade80' : '#f87171') : 'rgba(255,255,255,0.15)'}`,
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#fff',
                fontSize: '1.1rem',
                width: '160px',
                textAlign: 'center',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
            <button
              onClick={check}
              disabled={advancing || !userAnswer.trim()}
              style={{
                background: advancing ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #00D4FF, #7B40FF)',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 24px',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: advancing ? 'not-allowed' : 'pointer',
              }}
            >
              Check ✓
            </button>
          </div>
          {feedback && (
            <div style={{ marginTop: '16px', fontSize: '1rem', fontWeight: 600, color: feedback.correct ? '#4ade80' : '#f87171', minHeight: '1.5rem' }}>
              {feedback.text}
            </div>
          )}
        </div>

        <button
          onClick={() => { stopTimer(); setPhase('results') }}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', color: 'rgba(255,255,255,0.45)', fontSize: '13px', cursor: 'pointer' }}
        >
          End Early
        </button>
      </div>
    )
  }

  // ── Results ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '40px 48px', maxWidth: '640px' }}>
      <div style={{ ...cardStyle, borderLeft: '3px solid #00D4FF', textAlign: 'center', padding: '40px 32px', marginBottom: '24px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '8px' }}>{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>Quiz Complete!</h2>
        <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
          You scored{' '}
          <strong style={{ color: '#C9A84C', fontSize: '20px' }}>
            {score} / {questions.length} ({pct}%)
          </strong>
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '28px' }}>
          Time: {fmt(elapsed)}
        </div>
        <button
          onClick={() => setPhase('setup')}
          style={{ background: 'linear-gradient(135deg, #00D4FF, #7B40FF)', border: 'none', borderRadius: '10px', padding: '12px 28px', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
        >
          Try Again ↺
        </button>
      </div>

      {/* Review list */}
      <div style={cardStyle}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
          Question Review
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {review.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 0',
                borderBottom: i < review.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <span style={{ fontSize: '16px', color: r.correct ? '#4ade80' : '#f87171', flexShrink: 0 }}>
                {r.correct ? '✓' : '✗'}
              </span>
              <span style={{ flex: 1, fontSize: '14px', color: '#fff' }}>{r.question}</span>
              {!r.correct && (
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
                  You: {r.userAnswer} · ✓ {r.rightAnswer}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
