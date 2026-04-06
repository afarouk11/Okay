'use client'

import { useState } from 'react'
import { GraduationCap, Loader2, ChevronDown } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { useAuth } from '@/lib/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const TOPICS = [
  { value: 'number',     label: 'Number' },
  { value: 'algebra',    label: 'Algebra' },
  { value: 'geometry',   label: 'Geometry & Measures' },
  { value: 'statistics', label: 'Statistics & Probability' },
  { value: 'ratio',      label: 'Ratio, Proportion & Rates' },
  { value: 'mixed',      label: 'Mixed (Random)' },
]

const TIERS  = [{ value: 'foundation', label: 'Foundation' }, { value: 'higher', label: 'Higher' }]
const MARKS  = [{ value: '1-2', label: '1–2 marks' }, { value: '3-4', label: '3–4 marks' }, { value: '5-6', label: '5–6 marks' }]

const selectCls = `
  w-full bg-white/5 border border-white/10 text-white rounded-[10px]
  px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 cursor-pointer
`.trim()

export default function GcseClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [topic, setTopic]   = useState('mixed')
  const [tier, setTier]     = useState('foundation')
  const [marks, setMarks]   = useState('3-4')
  const [question, setQuestion] = useState('')
  const [solution, setSolution] = useState('')
  const [showSolution, setShowSolution] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [count, setCount]   = useState(0)

  useEffect(() => { if (!authLoading && !user) router.replace('/login') }, [authLoading, user, router])

  async function generate() {
    setLoading(true); setError(''); setShowSolution(false); setQuestion(''); setSolution('')
    try {
      const res = await fetch('/api/generate-gcse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, tier, marks }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Generation failed')
      setQuestion(data.question)
      setSolution(data.solution)
      setCount(c => c + 1)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) return null

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-60">
        <Header title="GCSE Maths" />
        <main className="flex-1 px-8 py-8 max-w-3xl">
          {/* Title */}
          <div className="flex items-center gap-3 mb-1">
            <GraduationCap className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">GCSE Maths</h1>
          </div>
          <p className="text-sm text-muted mb-8">AI-generated exam-style questions with full worked solutions</p>

          {/* Controls */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Topic</label>
              <select value={topic} onChange={e => setTopic(e.target.value)} className={selectCls}>
                {TOPICS.map(t => <option key={t.value} value={t.value} className="bg-[#0d1117]">{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 min-w-[120px]">
              <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Tier</label>
              <select value={tier} onChange={e => setTier(e.target.value)} className={selectCls}>
                {TIERS.map(t => <option key={t.value} value={t.value} className="bg-[#0d1117]">{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 min-w-[120px]">
              <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Marks</label>
              <select value={marks} onChange={e => setMarks(e.target.value)} className={selectCls}>
                {MARKS.map(m => <option key={m.value} value={m.value} className="bg-[#0d1117]">{m.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <button
                onClick={generate} disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: 'linear-gradient(135deg,#4F8CFF,#6C3EF4)' }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                Generate Question
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

          {/* Question card */}
          {question && (
            <div className="rounded-[14px] border border-primary/20 bg-primary/5 p-6 mb-4">
              <div className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">
                {TIERS.find(t=>t.value===tier)?.label} · {TOPICS.find(t=>t.value===topic)?.label} · {MARKS.find(m=>m.value===marks)?.label}
                {count > 0 && <span className="ml-3 text-primary">{count} generated this session</span>}
              </div>
              <p className="text-foreground text-[15px] leading-relaxed whitespace-pre-wrap">{question}</p>
              <div className="flex gap-3 mt-5">
                {!showSolution && (
                  <button
                    onClick={() => setShowSolution(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium border border-white/10 text-muted hover:text-foreground hover:border-white/20 transition-all"
                  >
                    <ChevronDown className="w-4 h-4" /> Show Solution
                  </button>
                )}
                <button
                  onClick={generate} disabled={loading}
                  className="px-4 py-2 rounded-[8px] text-sm font-medium border border-white/10 text-muted hover:text-foreground hover:border-white/20 transition-all disabled:opacity-50"
                >
                  New Question
                </button>
              </div>
            </div>
          )}

          {/* Solution card */}
          {showSolution && solution && (
            <div className="rounded-[14px] border border-purple-500/20 bg-purple-500/5 p-6">
              <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-3">✓ Worked Solution</div>
              <p className="text-foreground text-[15px] leading-relaxed whitespace-pre-wrap">{solution}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
