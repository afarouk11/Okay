'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BarChart3, Brain, Target } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'
import { useAuth } from '@/lib/useAuth'
import { gradeTrajectory, identifyWeakTopics, predictGrade } from '@/src/adaptive.js'

interface TopicStat {
  topic: string
  is_correct: boolean
}

const SAMPLE_TOPIC_RESULTS: TopicStat[] = [
  { topic: 'Differentiation', is_correct: true },
  { topic: 'Differentiation', is_correct: true },
  { topic: 'Differentiation', is_correct: false },
  { topic: 'Integration', is_correct: false },
  { topic: 'Integration', is_correct: false },
  { topic: 'Integration', is_correct: true },
  { topic: 'Statistics', is_correct: true },
  { topic: 'Statistics', is_correct: false },
  { topic: 'Vectors', is_correct: false },
  { topic: 'Vectors', is_correct: false },
  { topic: 'Mechanics', is_correct: true },
  { topic: 'Mechanics', is_correct: true },
]

export default function PredictClient() {
  const { token } = useAuth()
  const [targetGrade, setTargetGrade] = useState('A')
  const [accuracy, setAccuracy] = useState(72)
  const [questionsDone, setQuestionsDone] = useState(48)
  const [insightsLoaded, setInsightsLoaded] = useState(false)
  const [topicResults, setTopicResults] = useState<TopicStat[]>(SAMPLE_TOPIC_RESULTS)

  useEffect(() => {
    async function loadInsights() {
      if (!token) return
      try {
        const res = await fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'get_learning_insights' }),
        })
        if (!res.ok) return
        const data = await res.json() as {
          stats?: { accuracy_pct?: number; total_questions?: number }
          weak_topics?: Array<{ topic: string; attempts: number; accuracy: number }>
          grade_trajectory?: { target?: string }
        }

        if (typeof data.stats?.accuracy_pct === 'number') setAccuracy(data.stats.accuracy_pct)
        if (typeof data.stats?.total_questions === 'number') setQuestionsDone(data.stats.total_questions)
        if (data.grade_trajectory?.target) setTargetGrade(data.grade_trajectory.target)
        if (Array.isArray(data.weak_topics) && data.weak_topics.length > 0) {
          const derived: TopicStat[] = []
          for (const item of data.weak_topics) {
            const correctCount = Math.max(1, Math.round(item.attempts * item.accuracy))
            for (let i = 0; i < item.attempts; i++) {
              derived.push({ topic: item.topic, is_correct: i < correctCount })
            }
          }
          setTopicResults(derived)
        }
        setInsightsLoaded(true)
      } catch {
        // fall back to local sample data
      }
    }

    loadInsights()
  }, [token])

  const predicted = useMemo(() => predictGrade(accuracy / 100), [accuracy])
  const trajectory = useMemo(() => gradeTrajectory(accuracy / 100, targetGrade), [accuracy, targetGrade])
  const weakTopics = useMemo(() => identifyWeakTopics(topicResults, 0.7), [topicResults])
  const confidenceBand = accuracy >= 80 ? 'High confidence' : accuracy >= 65 ? 'Building well' : 'Needs focused revision'

  return (
    <AuthPageShell
      title="Exam Insights"
      subtitle="Prediction, weak-topic analysis, and next-step guidance"
      action={
        <Link
          href="/plan"
          className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
          style={{ background: '#4F8CFF' }}
        >
          Open plan →
        </Link>
      }
    >
      <div className="space-y-6 max-w-6xl">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs uppercase tracking-[0.14em] text-primary font-semibold mb-2">Predicted grade</div>
            <div className="text-4xl font-black text-foreground">{predicted}</div>
            <p className="text-sm text-muted mt-2">Based on current accuracy and recent topic coverage.</p>
          </div>
          <div className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs uppercase tracking-[0.14em] text-primary font-semibold mb-2">On-track status</div>
            <div className="text-xl font-semibold" style={{ color: trajectory.on_track ? '#22C55E' : '#F59E0B' }}>
              {trajectory.on_track ? 'On track' : `Target gap: ${trajectory.gap}`}
            </div>
            <p className="text-sm text-muted mt-2">Targeting {trajectory.target} with {accuracy}% current accuracy.</p>
          </div>
          <div className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs uppercase tracking-[0.14em] text-primary font-semibold mb-2">Question volume</div>
            <div className="text-4xl font-black text-foreground">{questionsDone}</div>
            <p className="text-sm text-muted mt-2">The prediction sharpens as you answer more questions.</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Tune your target</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted block mb-2">Target grade</label>
                <div className="flex gap-2 flex-wrap">
                  {['C', 'B', 'A', 'A*'].map(grade => (
                    <button
                      key={grade}
                      onClick={() => setTargetGrade(grade)}
                      className="px-3 py-2 rounded-lg text-sm font-medium"
                      style={{
                        background: targetGrade === grade ? 'rgba(79,140,255,0.14)' : 'rgba(255,255,255,0.04)',
                        color: targetGrade === grade ? '#4F8CFF' : '#9AA4AF',
                        border: targetGrade === grade ? '1px solid rgba(79,140,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted block mb-2">Current overall accuracy: {accuracy}%</label>
                <input
                  type="range"
                  min="35"
                  max="98"
                  value={accuracy}
                  onChange={e => setAccuracy(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="text-sm font-semibold text-foreground mb-1">What this means</div>
                <p className="text-sm text-muted leading-6">
                  {confidenceBand}. To move upward, focus on your bottom two topics and keep your streak of solved questions going.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Weak-topic scan</h2>
            </div>

            {weakTopics.length > 0 ? (
              <div className="space-y-3">
                {weakTopics.map(item => (
                  <div key={item.topic} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-sm font-semibold text-foreground">{item.topic}</span>
                      <span className="text-xs font-semibold" style={{ color: '#F59E0B' }}>
                        {Math.round(item.accuracy * 100)}% accuracy
                      </span>
                    </div>
                    <p className="text-xs text-muted">{item.attempts} tracked attempts — ideal candidate for new flashcards and a focused Jarvis session.</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl p-4 text-sm text-muted" style={{ background: 'rgba(255,255,255,0.03)' }}>
                No weak topics flagged yet — keep answering questions to sharpen the analysis.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Recommended next steps</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { title: 'Revise weak topics', desc: 'Turn the weakest area into flashcards and a short blitz set.', href: '/study?tab=flashcards' },
              { title: 'Practice exam questions', desc: 'Use the real question generator to improve your evidence base.', href: '/questions' },
              { title: 'Build today’s plan', desc: 'Let Jarvis schedule a focused revision block for you.', href: '/plan' },
            ].map(item => (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-xl p-4 block"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="text-sm font-semibold text-foreground mb-1">{item.title}</div>
                <p className="text-xs text-muted leading-5">{item.desc}</p>
              </Link>
            ))}
          </div>

          {insightsLoaded && (
            <p className="text-xs text-muted mt-4">Live adaptive insights loaded from your account.</p>
          )}
        </section>
      </div>
    </AuthPageShell>
  )
}
