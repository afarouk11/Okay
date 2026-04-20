'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, RefreshCw, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { useAuth } from '@/lib/useAuth'

const EXAM_BOARDS = ['AQA', 'Edexcel', 'OCR', 'WJEC'] as const
type ExamBoard = (typeof EXAM_BOARDS)[number]

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Foundation',
  2: 'Easy',
  3: 'Standard',
  4: 'Hard',
  5: 'Challenge',
}

type PaperQuestion = {
  question: string
  marks: number
  hints: string[]
  mark_scheme?: string
}

type PapersResult = {
  questions: PaperQuestion[]
  exam_board: string
  topic: string
  difficulty: number
}

export default function PapersClient() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useAuth()

  const [topic, setTopic] = useState('')
  const [examBoard, setExamBoard] = useState<ExamBoard>('AQA')
  const [difficulty, setDifficulty] = useState(3)
  const [count, setCount] = useState(3)
  const [includeMarkScheme, setIncludeMarkScheme] = useState(true)

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PapersResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  async function handleGenerate() {
    if (!token || !topic.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/papers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: topic.trim().slice(0, 120),
          exam_board: examBoard,
          difficulty,
          count,
          include_mark_scheme: includeMarkScheme,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error ?? `Error ${res.status}: failed to generate questions`)
        return
      }

      setResult(data as PapersResult)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

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

      <div className="flex-1 flex flex-col ml-[225px]">
        <Header
          title="Past Paper Questions"
          subtitle="AI-generated in the style of your exam board"
        />

        <main className="flex-1 px-8 py-6">
          <div className="flex gap-6 max-w-6xl flex-col lg:flex-row">
            {/* ── Form panel ── */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-card p-6 space-y-5 lg:w-80 flex-shrink-0"
              style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <h2 className="text-sm font-semibold text-foreground">Configure</h2>

              {/* Topic */}
              <div>
                <label className="text-xs text-muted mb-1.5 block font-medium">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. integration by parts"
                  maxLength={120}
                  className="w-full text-sm text-foreground px-3 py-2.5 rounded-[10px] outline-none placeholder:text-muted/50 focus:ring-1 focus:ring-primary/40"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                />
              </div>

              {/* Exam board */}
              <div>
                <label className="text-xs text-muted mb-1.5 block font-medium">Exam Board</label>
                <div className="relative">
                  <select
                    value={examBoard}
                    onChange={e => setExamBoard(e.target.value as ExamBoard)}
                    className="w-full appearance-none text-sm font-medium text-foreground px-3 py-2.5 pr-8 rounded-[10px] outline-none cursor-pointer"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {EXAM_BOARDS.map(b => (
                      <option key={b} value={b} style={{ background: '#121821' }}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                </div>
              </div>

              {/* Difficulty slider */}
              <div>
                <label className="text-xs text-muted mb-1.5 flex justify-between font-medium">
                  <span>Difficulty</span>
                  <span style={{ color: '#C9A84C' }}>{DIFFICULTY_LABELS[difficulty]}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={difficulty}
                  onChange={e => setDifficulty(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted mt-1">
                  <span>Foundation</span>
                  <span>Challenge</span>
                </div>
              </div>

              {/* Number of questions */}
              <div>
                <label className="text-xs text-muted mb-1.5 flex justify-between font-medium">
                  <span>Questions</span>
                  <span className="text-foreground">{count}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={count}
                  onChange={e => setCount(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted mt-1">
                  <span>1</span>
                  <span>5</span>
                </div>
              </div>

              {/* Mark scheme toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted font-medium">Include mark scheme</span>
                <button
                  onClick={() => setIncludeMarkScheme(v => !v)}
                  className="relative w-10 h-5 rounded-full transition-colors focus:outline-none"
                  style={{
                    background: includeMarkScheme ? '#4F8CFF' : 'rgba(255,255,255,0.1)',
                  }}
                  aria-pressed={includeMarkScheme}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: includeMarkScheme ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
              </div>

              {/* Generate button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#4F8CFF' }}
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                {loading ? 'Generating…' : 'Generate Questions'}
              </motion.button>
            </motion.div>

            {/* ── Results panel ── */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-card p-10 flex flex-col items-center gap-3"
                    style={{ background: 'rgba(18,24,33,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                    <p className="text-sm text-muted">Jarvis is writing your questions…</p>
                  </motion.div>
                ) : error ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-card p-6"
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <p className="text-sm text-red-400">{error}</p>
                  </motion.div>
                ) : result ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-4"
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(79,140,255,0.1)', color: '#4F8CFF', border: '1px solid rgba(79,140,255,0.2)' }}
                      >
                        {result.exam_board}
                      </span>
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}
                      >
                        {DIFFICULTY_LABELS[result.difficulty] ?? `Level ${result.difficulty}`}
                      </span>
                      <span className="text-xs text-muted">{result.topic}</span>
                    </div>

                    {result.questions.map((q, i) => (
                      <QuestionCard key={i} index={i} question={q} />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-card p-10 flex flex-col items-center text-center"
                    style={{ background: 'rgba(18,24,33,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <FileText className="w-10 h-10 mb-4" style={{ color: 'rgba(154,164,175,0.3)' }} />
                    <h3 className="text-base font-semibold text-foreground mb-2">No questions yet</h3>
                    <p className="text-sm text-muted">Generate questions above to start practising</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function QuestionCard({ index, question }: { index: number; question: PaperQuestion }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-card p-6 space-y-4"
      style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Question number + marks badge */}
      <div className="flex items-start justify-between gap-4">
        <span className="text-xs font-semibold text-muted">Q{index + 1}</span>
        <span
          className="flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.25)' }}
        >
          {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
        </span>
      </div>

      {/* Question text — monospace for LaTeX */}
      <pre
        className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono"
        style={{ fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace" }}
      >
        {question.question}
      </pre>

      {/* Hints */}
      {question.hints && question.hints.length > 0 && (
        <details className="group">
          <summary
            className="cursor-pointer text-xs font-medium select-none list-none flex items-center gap-1.5"
            style={{ color: '#C9A84C' }}
          >
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
            Hints ({question.hints.length})
          </summary>
          <div
            className="mt-2 rounded-lg p-3 space-y-1.5"
            style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)' }}
          >
            {question.hints.map((hint, hi) => (
              <p key={hi} className="text-xs text-muted leading-relaxed">
                💡 {hint}
              </p>
            ))}
          </div>
        </details>
      )}

      {/* Mark scheme */}
      {question.mark_scheme && (
        <details className="group">
          <summary
            className="cursor-pointer text-xs font-medium select-none list-none flex items-center gap-1.5"
            style={{ color: '#4F8CFF' }}
          >
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
            Mark Scheme
          </summary>
          <div
            className="mt-2 rounded-lg p-3"
            style={{ background: 'rgba(79,140,255,0.05)', border: '1px solid rgba(79,140,255,0.15)' }}
          >
            <pre
              className="text-xs text-muted leading-relaxed whitespace-pre-wrap font-mono"
              style={{ fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace" }}
            >
              {question.mark_scheme}
            </pre>
          </div>
        </details>
      )}
    </motion.div>
  )
}
