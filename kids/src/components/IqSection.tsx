'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface IqQuestion {
  type: string
  question: string
  options: string[]
  answer: 'A' | 'B' | 'C' | 'D'
  explanation: string
}

interface ReviewItem {
  question: IqQuestion
  selected: string
  isCorrect: boolean
}

type Phase = 'setup' | 'loading' | 'session' | 'results'

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

const EXERCISE_TYPES = [
  { id: 'Pattern Sequences', icon: '🔷', desc: 'Identify rules in visual and symbolic patterns' },
  { id: 'Number Series', icon: '🔢', desc: 'Find the next number in mathematical sequences' },
  { id: 'Verbal Analogies', icon: '💬', desc: 'Complete word relationship pairs' },
  { id: 'Spatial Reasoning', icon: '🧩', desc: 'Visualise and mentally rotate shapes' },
  { id: 'Logic Puzzles', icon: '🔮', desc: 'Deduce conclusions from given premises' },
]

const OPTION_LABELS = ['A', 'B', 'C', 'D']

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function IqSection() {
  const [exerciseType, setExerciseType] = useState('Mixed')
  const [difficulty, setDifficulty] = useState('Medium')
  const [phase, setPhase] = useState<Phase>('setup')
  const [error, setError] = useState<string | null>(null)

  // Session state
  const [questions, setQuestions] = useState<IqQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [review, setReview] = useState<ReviewItem[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(600)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopTimers = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null }
  }, [])

  useEffect(() => () => {
    stopTimers()
    if (advanceRef.current) clearTimeout(advanceRef.current)
  }, [stopTimers])

  // Auto-end when countdown hits 0
  useEffect(() => {
    if (secondsLeft <= 0 && phase === 'session') {
      stopTimers()
      setPhase('results')
    }
  }, [secondsLeft, phase, stopTimers])

  async function handleStart() {
    setError(null)
    setPhase('loading')

    try {
      const res = await fetch('/api/generate-iq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseType, difficulty }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? 'Failed to generate exercises. Please try again.')
        setPhase('setup')
        return
      }

      setQuestions(data.questions as IqQuestion[])
      setCurrentIdx(0)
      setScore(0)
      setReview([])
      setSelected(null)
      setRevealed(false)
      setSecondsLeft(600)
      setElapsedSeconds(0)
      setPhase('session')

      stopTimers()
      countdownRef.current = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
      elapsedRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    } catch {
      setError('Network error. Please check your connection and try again.')
      setPhase('setup')
    }
  }

  function handleSelect(optionLabel: string) {
    if (revealed) return
    setSelected(optionLabel)
    setRevealed(true)

    const q = questions[currentIdx]
    const isCorrect = optionLabel === q.answer
    if (isCorrect) setScore((s) => s + 1)
    setReview((r) => [...r, { question: q, selected: optionLabel, isCorrect }])

    advanceRef.current = setTimeout(() => {
      advance()
    }, 1800)
  }

  function advance() {
    const next = currentIdx + 1
    if (next >= questions.length) {
      stopTimers()
      setPhase('results')
    } else {
      setCurrentIdx(next)
      setSelected(null)
      setRevealed(false)
    }
  }

  function handleSkip() {
    if (advanceRef.current) { clearTimeout(advanceRef.current); advanceRef.current = null }
    const q = questions[currentIdx]
    if (!revealed) {
      setReview((r) => [...r, { question: q, selected: '—', isCorrect: false }])
    }
    const next = currentIdx + 1
    if (next >= questions.length) {
      stopTimers()
      setPhase('results')
    } else {
      setCurrentIdx(next)
      setSelected(null)
      setRevealed(false)
    }
  }

  function handleEndSession() {
    if (advanceRef.current) { clearTimeout(advanceRef.current); advanceRef.current = null }
    stopTimers()
    setPhase('results')
  }

  function handleReset() {
    stopTimers()
    if (advanceRef.current) { clearTimeout(advanceRef.current); advanceRef.current = null }
    setPhase('setup')
    setQuestions([])
    setCurrentIdx(0)
    setScore(0)
    setReview([])
    setSelected(null)
    setRevealed(false)
    setSecondsLeft(600)
    setElapsedSeconds(0)
    setError(null)
  }

  // ── SETUP ──────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div style={{ padding: '40px 48px', maxWidth: '860px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '28px' }}>🧠</span>
            <h1 style={{ fontSize: '28px', fontWeight: 700, background: 'linear-gradient(135deg, #00D4FF, #7B40FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
              Parental IQ Training
            </h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: '15px' }}>
            AI-generated cognitive exercise sessions — 8 questions, 10 minute timer
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)', borderRadius: '14px', padding: '16px 20px', color: '#ff6b6b', fontSize: '14px', marginBottom: '24px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Controls */}
        <div style={{ ...cardStyle, marginBottom: '28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={labelStyle}>Exercise Type</label>
              <select value={exerciseType} onChange={(e) => setExerciseType(e.target.value)} style={selectStyle}>
                <option value="Mixed">Mixed (All Types)</option>
                {EXERCISE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={selectStyle}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleStart}
            style={{ background: 'linear-gradient(135deg, #00D4FF, #7B40FF)', border: 'none', borderRadius: '10px', padding: '12px 28px', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
          >
            🧠 Start Session
          </button>
        </div>

        {/* Exercise type info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '12px' }}>
          {EXERCISE_TYPES.map((t) => (
            <div
              key={t.id}
              onClick={() => setExerciseType(t.id)}
              style={{
                ...cardStyle,
                padding: '16px',
                cursor: 'pointer',
                borderColor: exerciseType === t.id ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)',
                borderLeft: exerciseType === t.id ? '3px solid #00D4FF' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{t.icon}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: exerciseType === t.id ? '#00D4FF' : '#fff', marginBottom: '4px' }}>{t.id}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div style={{ padding: '40px 48px', maxWidth: '640px' }}>
        <div style={{ ...cardStyle, textAlign: 'center', padding: '80px 32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '20px' }}>🧠</div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', marginBottom: '20px' }}>
            Generating your IQ session
          </p>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            <span className="loading-dot" />
            <span className="loading-dot" />
            <span className="loading-dot" />
          </div>
        </div>
      </div>
    )
  }

  // ── SESSION ────────────────────────────────────────────────────────────────
  if (phase === 'session' && questions.length > 0) {
    const q = questions[currentIdx]
    const progressPct = (currentIdx / questions.length) * 100
    const timerWarning = secondsLeft < 60

    return (
      <div style={{ padding: '40px 48px', maxWidth: '700px' }}>
        {/* Stats bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
            Question <strong style={{ color: '#fff' }}>{currentIdx + 1}</strong> / {questions.length}
          </span>
          <span style={{ fontSize: '13px', color: '#C9A84C', fontWeight: 600 }}>
            Score: {score}
          </span>
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: timerWarning ? '#ff6b6b' : 'rgba(255,255,255,0.45)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            ⏱ {fmt(secondsLeft)}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '99px', height: '4px', marginBottom: '24px' }}>
          <div style={{ background: 'linear-gradient(90deg, #00D4FF, #7B40FF)', height: '4px', borderRadius: '99px', width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
        </div>

        {/* Type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#7B40FF', background: 'rgba(123,64,255,0.12)', border: '1px solid rgba(123,64,255,0.25)', borderRadius: '20px', padding: '3px 10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {q.type}
          </span>
        </div>

        {/* Question card */}
        <div style={{ ...cardStyle, borderLeft: '3px solid #00D4FF', marginBottom: '16px' }}>
          <p style={{ fontSize: '17px', lineHeight: '1.7', color: 'rgba(255,255,255,0.92)', margin: 0, whiteSpace: 'pre-wrap' }}>
            {q.question}
          </p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {q.options.map((opt, i) => {
            const label = OPTION_LABELS[i]
            const isSelected = selected === label
            const isCorrect = label === q.answer
            let borderColor = 'rgba(255,255,255,0.1)'
            let bg = 'rgba(255,255,255,0.03)'
            let textColor = 'rgba(255,255,255,0.8)'

            if (revealed) {
              if (isCorrect) {
                borderColor = 'rgba(0,212,100,0.6)'
                bg = 'rgba(0,212,100,0.08)'
                textColor = '#4ade80'
              } else if (isSelected && !isCorrect) {
                borderColor = 'rgba(255,80,80,0.6)'
                bg = 'rgba(255,80,80,0.08)'
                textColor = '#f87171'
              }
            }

            return (
              <button
                key={label}
                onClick={() => handleSelect(label)}
                disabled={revealed}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '14px 16px',
                  background: bg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '10px',
                  cursor: revealed ? 'default' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!revealed) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'
                }}
                onMouseLeave={(e) => {
                  if (!revealed) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'
                }}
              >
                <span style={{ flexShrink: 0, width: '26px', height: '26px', borderRadius: '50%', background: isSelected || (revealed && isCorrect) ? (isCorrect ? 'rgba(0,212,100,0.2)' : 'rgba(255,80,80,0.2)') : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: textColor }}>
                  {label}
                </span>
                <span style={{ fontSize: '15px', color: textColor, lineHeight: '1.5', paddingTop: '2px' }}>
                  {opt}
                </span>
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        {revealed && (
          <div style={{ background: 'rgba(123,64,255,0.07)', border: '1px solid rgba(123,64,255,0.2)', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#7B40FF', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Explanation
            </span>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: '1.6' }}>
              {q.explanation}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleSkip}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 16px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer' }}
          >
            Skip →
          </button>
          <button
            onClick={handleEndSession}
            style={{ background: 'transparent', border: '1px solid rgba(255,80,80,0.25)', borderRadius: '8px', padding: '8px 16px', color: 'rgba(255,80,80,0.6)', fontSize: '13px', cursor: 'pointer' }}
          >
            End Session
          </button>
        </div>
      </div>
    )
  }

  // ── RESULTS ────────────────────────────────────────────────────────────────
  const total = review.length
  const pct = total > 0 ? Math.round((score / questions.length) * 100) : 0

  return (
    <div style={{ padding: '40px 48px', maxWidth: '700px' }}>
      {/* Score card */}
      <div style={{ ...cardStyle, borderLeft: '3px solid #00D4FF', textAlign: 'center', padding: '40px 32px', marginBottom: '24px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '8px' }}>
          {pct >= 80 ? '🏆' : pct >= 60 ? '🎉' : pct >= 40 ? '👍' : '💪'}
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>
          Session Complete!
        </h2>
        <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
          Score:{' '}
          <strong style={{ color: '#C9A84C', fontSize: '22px' }}>
            {score} / {questions.length} ({pct}%)
          </strong>
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '28px' }}>
          Time elapsed: {fmt(elapsedSeconds)}
        </div>

        <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', maxWidth: '300px', margin: '0 auto 28px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#4ade80' : 'linear-gradient(90deg, #00D4FF, #7B40FF)', borderRadius: '3px', transition: 'width 0.6s ease' }} />
        </div>

        <button
          onClick={handleReset}
          style={{ background: 'linear-gradient(135deg, #00D4FF, #7B40FF)', border: 'none', borderRadius: '10px', padding: '12px 28px', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
        >
          New Session ↺
        </button>
      </div>

      {/* Review list */}
      <div style={cardStyle}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
          Full Review
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {review.map((r, i) => (
            <div
              key={i}
              style={{
                padding: '14px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '10px',
                borderLeft: `3px solid ${r.isCorrect ? '#4ade80' : '#f87171'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                  Q{i + 1} · {r.question.type}
                </span>
                <span style={{ fontSize: '13px', color: r.isCorrect ? '#4ade80' : '#f87171', fontWeight: 700, flexShrink: 0 }}>
                  {r.isCorrect ? '✓ Correct' : `✗ Wrong (Ans: ${r.question.answer})`}
                </span>
              </div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: '0 0 8px', lineHeight: '1.5' }}>
                {r.question.question}
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: '1.5', fontStyle: 'italic' }}>
                {r.question.explanation}
              </p>
            </div>
          ))}
          {review.length === 0 && (
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              No questions answered this session.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
