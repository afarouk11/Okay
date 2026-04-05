'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type ExerciseType = 'mixed' | 'pattern' | 'number' | 'verbal' | 'spatial' | 'logic'
type Difficulty = 'junior' | 'standard' | 'advanced'
type Phase = 'setup' | 'loading' | 'session' | 'results'

interface IqQuestion {
  type: string
  question: string
  options: string[]
  answer: 'A' | 'B' | 'C' | 'D'
  explanation: string
}

interface ReviewItem {
  question: string
  type: string
  correct: boolean
  selected: string
  rightAnswer: string
  explanation: string
  skipped: boolean
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

const introCards = [
  { icon: '🔢', label: 'Number Series', desc: 'Find the pattern, predict the next numbers' },
  { icon: '🔷', label: 'Pattern Sequences', desc: 'Complete symbolic or abstract sequences' },
  { icon: '💬', label: 'Verbal Analogies', desc: 'Word relationships and vocabulary reasoning' },
  { icon: '🧩', label: 'Spatial Reasoning', desc: 'Mental rotation and shape transformation' },
  { icon: '🔮', label: 'Logic Puzzles', desc: 'Deductive reasoning with clear premises' },
]

export default function IqSection() {
  const [exerciseType, setExerciseType] = useState<ExerciseType>('mixed')
  const [difficulty, setDifficulty] = useState<Difficulty>('standard')
  const [phase, setPhase] = useState<Phase>('setup')
  const [error, setError] = useState<string | null>(null)

  const [questions, setQuestions] = useState<IqQuestion[]>([])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [review, setReview] = useState<ReviewItem[]>([])
  const [feedback, setFeedback] = useState<{ text: string; correct: boolean; explanation: string } | null>(null)
  const [advancing, setAdvancing] = useState(false)

  const [secondsLeft, setSecondsLeft] = useState(600)
  const [elapsed, setElapsed] = useState(0)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => () => stopTimer(), [stopTimer])

  async function startSession() {
    setError(null)
    setPhase('loading')

    try {
      const res = await fetch('/api/generate-iq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseType, difficulty }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to generate session')
      if (!Array.isArray(data.questions) || data.questions.length === 0) throw new Error('No questions returned')

      setQuestions(data.questions)
      setIdx(0)
      setScore(0)
      setReview([])
      setFeedback(null)
      setAdvancing(false)
      setSecondsLeft(600)
      setElapsed(0)
      setPhase('session')

      stopTimer()
      let secs = 0
      timerRef.current = setInterval(() => {
        secs++
        setElapsed(secs)
        setSecondsLeft((s) => {
          if (s <= 1) {
            stopTimer()
            setPhase('results')
            return 0
          }
          return s - 1
        })
      }, 1000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setPhase('setup')
    }
  }

  function answer(selected: string) {
    if (advancing) return
    const q = questions[idx]
    const correct = selected === q.answer
    setFeedback({
      text: correct ? '✓ Correct!' : `✗ Correct answer: ${q.answer}`,
      correct,
      explanation: q.explanation,
    })
    if (correct) setScore((s) => s + 1)
    setReview((r) => [...r, { question: q.question, type: q.type, correct, selected, rightAnswer: q.answer, explanation: q.explanation, skipped: false }])
    setAdvancing(true)

    setTimeout(() => {
      setAdvancing(false)
      setFeedback(null)
      const next = idx + 1
      if (next >= questions.length) { stopTimer(); setPhase('results') }
      else setIdx(next)
    }, 1800)
  }

  function skip() {
    const q = questions[idx]
    setReview((r) => [...r, { question: q.question, type: q.type, correct: false, selected: '—', rightAnswer: q.answer, explanation: q.explanation, skipped: true }])
    const next = idx + 1
    if (next >= questions.length) { stopTimer(); setPhase('results') }
    else setIdx(next)
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0
  const progress = questions.length ? (idx / questions.length) * 100 : 0

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (phase === 'setup' || phase === 'loading') {
    return (
      <div style={{ padding: '40px 48px', maxWidth: '900px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '28px' }}>🧠</span>
            <h1 style={{ fontSize: '28px', fontWeight: 700, background: 'linear-gradient(135deg, #00D4FF, #7B40FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
              Parental IQ Training
            </h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: '15px' }}>
            Daily ~10-minute cognitive exercises for children and parents to sharpen reasoning together
          </p>
        </div>

        <div style={{ ...cardStyle, marginBottom: '28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={labelStyle}>Exercise Type</label>
              <select value={exerciseType} onChange={(e) => setExerciseType(e.target.value as ExerciseType)} style={selectStyle}>
                <option value="mixed">Daily Mix (Recommended)</option>
                <option value="pattern">Pattern Sequences</option>
                <option value="number">Number Series</option>
                <option value="verbal">Verbal Analogies</option>
                <option value="spatial">Spatial Reasoning</option>
                <option value="logic">Logic Puzzles</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} style={selectStyle}>
                <option value="junior">Junior (Child-friendly, ages 8–12)</option>
                <option value="standard">Standard (Ages 13+)</option>
                <option value="advanced">Advanced (Adult level)</option>
              </select>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)', borderRadius: '10px', padding: '12px 16px', color: '#ff6b6b', fontSize: '14px', marginBottom: '16px' }}>
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={startSession}
            disabled={phase === 'loading'}
            style={{
              background: phase === 'loading' ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #00D4FF, #7B40FF)',
              border: 'none', borderRadius: '10px', padding: '12px 28px',
              color: '#fff', fontSize: '15px', fontWeight: 600,
              cursor: phase === 'loading' ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}
          >
            {phase === 'loading' ? (
              <>
                <span>Generating session</span>
                <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span className="loading-dot" />
                  <span className="loading-dot" />
                  <span className="loading-dot" />
                </span>
              </>
            ) : '▶ Start Daily Session'}
          </button>
        </div>

        {/* Intro cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
          {introCards.map((c) => (
            <div key={c.label} style={{ ...cardStyle, padding: '16px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{c.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{c.label}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>{c.desc}</div>
            </div>
          ))}
          <div style={{ ...cardStyle, padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏱</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>~10 Minutes</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>Fits perfectly into a morning routine</div>
          </div>
        </div>
      </div>
    )
  }

  // ── Session ────────────────────────────────────────────────────────────────
  if (phase === 'session') {
    const q = questions[idx]
    const timerDanger = secondsLeft < 60
    return (
      <div style={{ padding: '40px 48px', maxWidth: '700px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>
            Exercise <strong style={{ color: '#fff' }}>{idx + 1}</strong> of {questions.length}
          </div>
          <div style={{ fontSize: '14px', color: '#C9A84C', fontWeight: 600 }}>
            Score: {score}
          </div>
          <div style={{ fontSize: '14px', color: timerDanger ? '#f87171' : 'rgba(255,255,255,0.45)', fontWeight: timerDanger ? 700 : 400, transition: 'color 0.3s' }}>
            ⏱ {fmt(secondsLeft)}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '99px', height: '6px', marginBottom: '24px' }}>
          <div style={{ background: 'linear-gradient(90deg, #7B40FF, #00D4FF)', height: '6px', borderRadius: '99px', width: `${progress}%`, transition: 'width 0.4s ease' }} />
        </div>

        {/* Question card */}
        <div style={{ ...cardStyle, borderLeft: '3px solid #7B40FF', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#7B40FF', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            {q?.type} Exercise
          </div>
          <p style={{ fontSize: '16px', lineHeight: '1.75', color: 'rgba(255,255,255,0.9)', margin: '0 0 24px 0', whiteSpace: 'pre-wrap' }}>
            {q?.question}
          </p>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(q?.options ?? []).map((opt, i) => {
              const letter = ['A', 'B', 'C', 'D'][i]
              return (
                <button
                  key={letter}
                  onClick={() => answer(letter)}
                  disabled={advancing}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: advancing ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!advancing) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,212,255,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    if (!advancing) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'
                  }}
                >
                  <span style={{ color: '#00D4FF', fontWeight: 600, marginRight: '10px' }}>{letter})</span>
                  {opt}
                </button>
              )
            })}
          </div>

          {/* Feedback */}
          {feedback && (
            <div style={{ marginTop: '16px', padding: '12px 16px', background: feedback.correct ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${feedback.correct ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`, borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: feedback.correct ? '#4ade80' : '#f87171', marginBottom: feedback.explanation ? '6px' : '0' }}>
                {feedback.text}
              </div>
              {feedback.explanation && (
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.5' }}>
                  {feedback.explanation}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={skip} disabled={advancing} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', color: 'rgba(255,255,255,0.45)', fontSize: '13px', cursor: 'pointer' }}>
            Skip →
          </button>
          <button onClick={() => { stopTimer(); setPhase('results') }} style={{ background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '8px', padding: '8px 16px', color: '#ff6b6b', fontSize: '13px', cursor: 'pointer' }}>
            End Session
          </button>
        </div>
      </div>
    )
  }

  // ── Results ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '40px 48px', maxWidth: '700px' }}>
      <div style={{ ...cardStyle, borderLeft: '3px solid #00D4FF', textAlign: 'center', padding: '40px 32px', marginBottom: '24px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '8px' }}>{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'}</div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>Session Complete!</h2>
        <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
          Score:{' '}
          <strong style={{ color: '#C9A84C', fontSize: '20px' }}>
            {score} / {questions.length} ({pct}%)
          </strong>
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '28px' }}>
          Time taken: {fmt(elapsed)}
        </div>
        <button
          onClick={() => setPhase('setup')}
          style={{ background: 'linear-gradient(135deg, #00D4FF, #7B40FF)', border: 'none', borderRadius: '10px', padding: '12px 28px', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
        >
          New Session ↺
        </button>
      </div>

      {/* Review */}
      <div style={{ ...cardStyle, maxHeight: '420px', overflowY: 'auto' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
          Exercise Review
        </div>
        {review.map((r, i) => (
          <div key={i} style={{ padding: '12px 0', borderBottom: i < review.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: r.correct ? '0' : '6px' }}>
              <span style={{ color: r.correct ? '#4ade80' : '#f87171', fontSize: '15px', flexShrink: 0 }}>
                {r.correct ? '✓' : r.skipped ? '→' : '✗'}
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', padding: '1px 8px', borderRadius: '4px', flexShrink: 0 }}>
                {r.type}
              </span>
              <span style={{ fontSize: '13px', color: '#fff', flex: 1 }}>
                {r.question.length > 90 ? r.question.slice(0, 90) + '…' : r.question}
              </span>
            </div>
            {!r.correct && (
              <div style={{ paddingLeft: '24px', fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>
                {r.skipped ? 'Skipped' : `You: ${r.selected}`} · Correct: {r.rightAnswer}
                {r.explanation && ` — ${r.explanation}`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
