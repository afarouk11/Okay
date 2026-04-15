'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Target, RefreshCw, Zap } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'
import { useAuth } from '@/lib/useAuth'

interface Mistake {
  id?: string
  topic: string
  subject: string
  question?: string
  error_note?: string
  count?: number
  logged_at?: string
}

export default function MistakesClient() {
  const { token } = useAuth()
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [practiceOutput, setPracticeOutput] = useState('')
  const [practising, setPractising] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch('/api/progress', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.mistakes) setMistakes(data.mistakes)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const subjects = ['all', ...Array.from(new Set(mistakes.map(m => m.subject))).filter(Boolean)]
  const filtered = filter === 'all' ? mistakes : mistakes.filter(m => m.subject === filter)

  // Group by topic
  const grouped = filtered.reduce<Record<string, Mistake[]>>((acc, m) => {
    const key = m.topic || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})
  const sortedTopics = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)

  async function practiseWeakAreas() {
    if (!token || sortedTopics.length === 0) return
    setPractising(true)
    setPracticeOutput('')
    const weakTopics = sortedTopics.slice(0, 3).map(([t]) => t).join(', ')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `My weakest A-Level Maths topics are: ${weakTopics}. Give me 3 targeted practice questions (one per topic) with worked solutions to help me fix these mistakes.`,
          }],
        }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setPracticeOutput(text)
      }
    } catch {}
    setPractising(false)
  }

  return (
    <AuthPageShell
      title="Common Mistakes"
      subtitle="Topics you repeatedly get wrong — targeted revision to fix them"
      action={
        <button
          onClick={practiseWeakAreas}
          disabled={practising || mistakes.length === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-opacity"
          style={{ background: '#C9A84C', color: '#08090E', opacity: practising ? 0.6 : 1 }}
        >
          <Target className="w-4 h-4" />
          {practising ? 'Generating…' : 'Practise Weak Areas'}
        </button>
      }
    >
      <div className="max-w-3xl space-y-5">
        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all"
              style={filter === s
                ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#6B7394', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {s === 'all' ? 'All Topics' : s}
            </button>
          ))}
        </div>

        {/* Practice output */}
        {practiceOutput && (
          <div
            className="rounded-xl p-5 text-sm leading-relaxed whitespace-pre-wrap"
            style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', color: '#9AA4AF' }}
          >
            {practiceOutput}
          </div>
        )}

        {/* Mistakes list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : sortedTopics.length === 0 ? (
          <div className="text-center py-16" style={{ color: '#6B7394' }}>
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No mistakes logged yet</p>
            <p className="text-sm mt-1">Complete practice questions and your weak areas will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTopics.map(([topic, items]) => (
              <div
                key={topic}
                className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-foreground">{topic}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: items.length >= 3 ? 'rgba(239,68,68,0.1)' : 'rgba(251,146,60,0.1)',
                      color: items.length >= 3 ? '#EF4444' : '#FB923C',
                    }}
                  >
                    {items.length}× missed
                  </span>
                </div>
                {items[0]?.error_note && (
                  <p className="text-xs" style={{ color: '#6B7394' }}>{items[0].error_note}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={async () => {
                      setPractising(true)
                      setPracticeOutput('')
                      try {
                        const res = await fetch('/api/chat', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({
                            messages: [{ role: 'user', content: `Give me a targeted A-Level Maths practice question on ${topic} with a full worked solution.` }],
                          }),
                        })
                        const reader = res.body!.getReader()
                        const decoder = new TextDecoder()
                        let text = ''
                        while (true) {
                          const { done, value } = await reader.read()
                          if (done) break
                          text += decoder.decode(value, { stream: true })
                          setPracticeOutput(text)
                        }
                      } catch {}
                      setPractising(false)
                    }}
                    className="text-xs flex items-center gap-1 transition-colors"
                    style={{ color: '#00D4FF' }}
                  >
                    <Zap className="w-3 h-3" />
                    Quick practice
                  </button>
                  <span className="text-xs" style={{ color: '#6B7394' }}>
                    Last seen: {items[0]?.logged_at ? new Date(items[0].logged_at).toLocaleDateString('en-GB') : 'recently'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthPageShell>
  )
}
