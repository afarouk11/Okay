'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, RefreshCw, ChevronDown, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'

const TOPICS = [
  'Algebra & Functions',
  'Coordinate Geometry',
  'Sequences & Series',
  'Trigonometry',
  'Exponentials & Logarithms',
  'Differentiation',
  'Integration',
  'Vectors',
  'Probability',
  'Statistical Distributions',
  'Hypothesis Testing',
  'Kinematics',
  'Forces & Newton\'s Laws',
]

const DIFFICULTIES = ['Foundation', 'Standard', 'Challenge', 'Exam-style']

type Question = {
  question: string
  hint: string
  topic: string
  difficulty: string
}

export default function QuestionsClient() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useAuth()
  const [topic, setTopic] = useState(TOPICS[0])
  const [difficulty, setDifficulty] = useState('Standard')
  const [question, setQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [answered, setAnswered] = useState<'correct' | 'incorrect' | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  const generateQuestion = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setQuestion(null)
    setShowHint(false)
    setAnswered(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Generate a single ${difficulty} difficulty exam-style question on "${topic}" for A-Level Maths.

Return ONLY a JSON object:
{"question": "the question text", "hint": "a helpful hint without giving the answer"}

No other text.`,
            },
          ],
          systemPrompt:
            'You are a maths question generator. Return only valid JSON. No markdown, no extra text.',
        }),
      })

      const data = await res.json()
      const raw: string = data.response ?? ''
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        setQuestion({ ...parsed, topic, difficulty })
      }
    } catch {
      // no-op
    } finally {
      setLoading(false)
    }
  }, [topic, difficulty, token])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#0B0F14' }}>
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen" style={{ background: '#0B0F14' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col ml-60">
        <Header title="Practice Questions" subtitle="AI-generated exam-style questions" />

        <main className="flex-1 px-8 py-6 max-w-3xl">
          {/* Controls */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-card p-5 mb-6"
            style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              {/* Topic picker */}
              <div className="relative flex-1 min-w-[200px]">
                <label className="text-xs text-muted mb-1.5 block font-medium">Topic</label>
                <div className="relative">
                  <select
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    className="w-full appearance-none text-sm font-medium text-foreground px-3 py-2.5 pr-8 rounded-[10px] outline-none cursor-pointer"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {TOPICS.map(t => (
                      <option key={t} value={t} style={{ background: '#121821' }}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                </div>
              </div>

              {/* Difficulty picker */}
              <div className="relative">
                <label className="text-xs text-muted mb-1.5 block font-medium">Difficulty</label>
                <div className="flex gap-1.5">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: difficulty === d ? 'rgba(79,140,255,0.15)' : 'rgba(255,255,255,0.04)',
                        border: difficulty === d ? '1px solid rgba(79,140,255,0.35)' : '1px solid rgba(255,255,255,0.07)',
                        color: difficulty === d ? '#4F8CFF' : '#9AA4AF',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <div className="flex items-end">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={generateQuestion}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: '#4F8CFF' }}
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}
                  {loading ? 'Generating…' : 'Generate'}
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Question card */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-card p-8 flex flex-col items-center gap-3"
                style={{ background: 'rgba(18,24,33,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                <p className="text-sm text-muted">Generating question…</p>
              </motion.div>
            ) : question ? (
              <motion.div
                key={question.question}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="rounded-card p-6 space-y-5"
                style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {/* Tags */}
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(79,140,255,0.1)', color: '#4F8CFF', border: '1px solid rgba(79,140,255,0.2)' }}
                  >
                    {question.topic}
                  </span>
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
                  >
                    {question.difficulty}
                  </span>
                </div>

                {/* Question text */}
                <p className="text-base text-foreground leading-relaxed font-medium">
                  {question.question}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowHint(v => !v)}
                    className="text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                    style={{
                      background: 'rgba(245,158,11,0.08)',
                      border: '1px solid rgba(245,158,11,0.2)',
                      color: '#f59e0b',
                    }}
                  >
                    {showHint ? 'Hide hint' : 'Show hint'}
                  </motion.button>

                  <Link href={`/chat?q=${encodeURIComponent(question.question)}`}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                      style={{
                        background: 'rgba(79,140,255,0.08)',
                        border: '1px solid rgba(79,140,255,0.2)',
                        color: '#4F8CFF',
                      }}
                    >
                      Ask Jarvis
                    </motion.button>
                  </Link>

                  <div className="flex items-center gap-2 ml-auto">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAnswered('correct')}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={{
                        background: answered === 'correct' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                        border: answered === 'correct' ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,255,255,0.07)',
                        color: answered === 'correct' ? '#22C55E' : '#9AA4AF',
                      }}
                      title="Got it right"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAnswered('incorrect')}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={{
                        background: answered === 'incorrect' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                        border: answered === 'incorrect' ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.07)',
                        color: answered === 'incorrect' ? '#ef4444' : '#9AA4AF',
                      }}
                      title="Got it wrong"
                    >
                      <X className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>

                {/* Hint */}
                <AnimatePresence>
                  {showHint && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="rounded-lg p-3 text-sm text-muted"
                        style={{
                          background: 'rgba(245,158,11,0.05)',
                          border: '1px solid rgba(245,158,11,0.15)',
                        }}
                      >
                        💡 {question.hint}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-card p-10 flex flex-col items-center text-center"
                style={{ background: 'rgba(18,24,33,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <HelpCircle className="w-10 h-10 mb-4" style={{ color: 'rgba(154,164,175,0.3)' }} />
                <h3 className="text-base font-semibold text-foreground mb-2">Ready to practise?</h3>
                <p className="text-sm text-muted">
                  Select a topic and difficulty, then hit Generate.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
