'use client'

import { useEffect, useRef, useState } from 'react'
import { Zap, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'
import { useAuth } from '@/lib/useAuth'

type Topic = 'mixed' | 'algebra' | 'calculus' | 'trigonometry' | 'statistics' | 'mechanics' | 'sequences' | 'logs' | 'vectors'
type Difficulty = 'easy' | 'medium' | 'hard'
type Phase = 'setup' | 'active' | 'review' | 'done'

interface BlitzQuestion {
  question: string
  answer: string
  explanation: string
}

interface Result {
  question: string
  userAnswer: string
  correctAnswer: string
  explanation: string
  correct: boolean
  timeLeft: number
}

const TOPICS: { value: Topic; label: string }[] = [
  { value: 'mixed',         label: 'Mixed (All Topics)' },
  { value: 'algebra',       label: 'Algebra' },
  { value: 'calculus',      label: 'Calculus' },
  { value: 'trigonometry',  label: 'Trigonometry' },
  { value: 'statistics',    label: 'Statistics' },
  { value: 'mechanics',     label: 'Mechanics' },
  { value: 'sequences',     label: 'Sequences & Series' },
  { value: 'logs',          label: 'Exponentials & Logs' },
  { value: 'vectors',       label: 'Vectors' },
]

const TOTAL = 5
const TIME_PER_Q = 60

export default function BlitzClient() {
  const { token } = useAuth()
  const [phase, setPhase] = useState<Phase>('setup')
  const [topic, setTopic] = useState<Topic>('mixed')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [questions, setQuestions] = useState<BlitzQuestion[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q)
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  function startTimer() {
    setTimeLeft(TIME_PER_Q)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          handleSubmit('', 0, true)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  async function startBlitz() {
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Generate exactly ${TOTAL} A-Level Maths blitz questions. Topic: ${topic === 'mixed' ? 'mixed selection across all topics' : topic}. Difficulty: ${difficulty}.
Return ONLY valid JSON array: [{"question":"...","answer":"...","explanation":"..."}]. No markdown, no extra text.`,
          }],
          systemPrompt: 'You are an A-Level Maths question generator. Return only a JSON array of question objects with fields: question, answer, explanation. No markdown fences.',
        }),
      })
      let text = ''
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
      }
      // Strip markdown fences if present
      const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed: BlitzQuestion[] = JSON.parse(jsonStr)
      setQuestions(parsed.slice(0, TOTAL))
      setQIndex(0)
      setResults([])
      setAnswer('')
      setPhase('active')
      startTimer()
    } catch {
      alert('Failed to generate questions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(overrideAnswer?: string, overrideTimeLeft?: number, timedOut = false) {
    if (timerRef.current) clearInterval(timerRef.current)
    setSubmitting(true)
    const userAnswer = overrideAnswer !== undefined ? overrideAnswer : answer
    const tLeft = overrideTimeLeft !== undefined ? overrideTimeLeft : timeLeft
    const q = questions[qIndex]

    // Ask AI to mark
    let correct = false
    let explanation = q.explanation
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Question: ${q.question}\nCorrect answer: ${q.answer}\nStudent answer: ${timedOut ? '[no answer — timed out]' : userAnswer}\n\nIs the student's answer correct (allow equivalent forms)? Reply with JSON only: {"correct":true/false,"explanation":"brief 1-2 sentence explanation"}`,
          }],
          systemPrompt: 'You are a strict A-Level Maths marker. Return only JSON with fields correct (boolean) and explanation (string).',
        }),
      })
      let text = ''
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
      }
      const parsed = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
      correct = parsed.correct
      explanation = parsed.explanation || q.explanation
    } catch {}

    const newResult: Result = {
      question: q.question,
      userAnswer: timedOut ? 'No answer (timed out)' : userAnswer,
      correctAnswer: q.answer,
      explanation,
      correct,
      timeLeft: tLeft,
    }
    const newResults = [...results, newResult]
    setResults(newResults)

    if (qIndex + 1 >= questions.length) {
      setPhase('done')
    } else {
      setPhase('review')
    }
    setSubmitting(false)
  }

  function nextQuestion() {
    setQIndex(i => i + 1)
    setAnswer('')
    setPhase('active')
    startTimer()
  }

  function reset() {
    setPhase('setup')
    setQuestions([])
    setResults([])
    setQIndex(0)
    setAnswer('')
  }

  const score = results.filter(r => r.correct).length
  const pct = Math.round((score / TOTAL) * 100)

  return (
    <AuthPageShell title="Quick Blitz" subtitle="5 rapid-fire questions, 60 seconds each — sharpen your recall">
      <div className="max-w-xl">

        {/* Setup */}
        {phase === 'setup' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B7394' }}>Topic</label>
                <select
                  value={topic}
                  onChange={e => setTopic(e.target.value as Topic)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
                >
                  {TOPICS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B7394' }}>Difficulty</label>
                <select
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value as Difficulty)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
                >
                  <option value="easy">Easy (AS Level recall)</option>
                  <option value="medium">Medium (A-Level exam)</option>
                  <option value="hard">Hard (A* challenge)</option>
                </select>
              </div>
            </div>
            <button
              onClick={startBlitz}
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#A07830)', color: '#08090E', opacity: loading ? 0.6 : 1 }}
            >
              <Zap className="w-4 h-4" />
              {loading ? 'Generating questions…' : 'Start Blitz'}
            </button>
          </div>
        )}

        {/* Active question */}
        {phase === 'active' && questions[qIndex] && (
          <div>
            <div className="flex justify-between items-center mb-3 text-sm" style={{ color: '#6B7394' }}>
              <span>Question {qIndex + 1} of {TOTAL}</span>
              <span
                className="font-bold text-lg"
                style={{ color: timeLeft <= 10 ? '#EF4444' : '#C9A84C' }}
              >
                {timeLeft}s
              </span>
              <span>Score: {score}</span>
            </div>
            {/* Timer bar */}
            <div className="h-1.5 rounded-full mb-5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(timeLeft / TIME_PER_Q) * 100}%`,
                  background: timeLeft <= 10 ? '#EF4444' : '#C9A84C',
                  transitionDuration: '1s',
                }}
              />
            </div>
            <div
              className="rounded-xl p-5 mb-4 text-sm leading-relaxed"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {questions[qIndex].question}
            </div>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              rows={3}
              placeholder="Your answer…"
              className="w-full rounded-xl px-4 py-3 text-sm resize-none mb-3"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity"
              style={{ background: '#C9A84C', color: '#08090E', opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? 'Marking…' : 'Submit Answer'}
            </button>
          </div>
        )}

        {/* Per-question review */}
        {phase === 'review' && results.length > 0 && (
          <div>
            <div
              className="rounded-xl p-5 mb-4"
              style={{
                background: results[results.length - 1].correct
                  ? 'rgba(34,197,94,0.08)'
                  : 'rgba(239,68,68,0.08)',
                border: `1px solid ${results[results.length - 1].correct ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                {results[results.length - 1].correct
                  ? <CheckCircle className="w-5 h-5 text-green-400" />
                  : <XCircle className="w-5 h-5 text-red-400" />}
                <span className="font-semibold text-sm">
                  {results[results.length - 1].correct ? 'Correct!' : 'Incorrect'}
                </span>
              </div>
              <p className="text-xs mb-2" style={{ color: '#6B7394' }}>
                Correct answer: <span className="font-medium text-foreground">{results[results.length - 1].correctAnswer}</span>
              </p>
              <p className="text-xs leading-relaxed" style={{ color: '#9AA4AF' }}>
                {results[results.length - 1].explanation}
              </p>
            </div>
            <button
              onClick={nextQuestion}
              className="w-full py-3 rounded-xl font-semibold text-sm"
              style={{ background: '#C9A84C', color: '#08090E' }}
            >
              Next Question →
            </button>
          </div>
        )}

        {/* Final results */}
        {phase === 'done' && (
          <div>
            <div
              className="rounded-2xl p-6 text-center mb-5"
              style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}
            >
              <div className="text-5xl font-black mb-1" style={{ color: '#C9A84C' }}>{pct}%</div>
              <div className="text-sm" style={{ color: '#6B7394' }}>
                {score} / {TOTAL} correct
              </div>
            </div>
            <div className="space-y-3 mb-5">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl p-4 text-sm"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  {r.correct
                    ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className="text-xs mb-1" style={{ color: '#9AA4AF' }}>{r.question}</p>
                    {!r.correct && (
                      <p className="text-xs" style={{ color: '#6B7394' }}>
                        Your answer: <em>{r.userAnswer}</em> · Correct: <strong className="text-foreground">{r.correctAnswer}</strong>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={reset}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{ background: '#C9A84C', color: '#08090E' }}
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}
      </div>
    </AuthPageShell>
  )
}
