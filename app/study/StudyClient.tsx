'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Brain, Layers3, ListChecks, Sparkles } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'
import { sm2Update } from '@/src/adaptive.js'

type StudyTab = 'flashcards' | 'blitz' | 'checklist'

interface StudyClientProps {
  initialTab?: StudyTab
}

interface Flashcard {
  id: string
  front: string
  back: string
  topic: string
  repetitions: number
  interval_days: number
  easiness_factor: number
  dueAt: string
}

interface ChecklistItem {
  topic: string
  confidence: 0 | 1 | 2
}

const FLASHCARD_KEY = 'synaptiq.study.flashcards'
const CHECKLIST_KEY = 'synaptiq.study.checklist'

const DEFAULT_CARDS: Flashcard[] = [
  {
    id: 'diff-product-rule',
    front: 'Differentiate x³sin(x)',
    back: 'Use the product rule: d/dx[x³sin(x)] = 3x²sin(x) + x³cos(x).',
    topic: 'Differentiation',
    repetitions: 0,
    interval_days: 1,
    easiness_factor: 2.5,
    dueAt: new Date().toISOString(),
  },
  {
    id: 'integration-parts',
    front: 'When is integration by parts useful?',
    back: 'When the integrand is a product of two terms and differentiating one simplifies it, e.g. x·eˣ or x·ln(x).',
    topic: 'Integration',
    repetitions: 0,
    interval_days: 1,
    easiness_factor: 2.5,
    dueAt: new Date().toISOString(),
  },
  {
    id: 'normal-z-score',
    front: 'What does a z-score represent?',
    back: 'How many standard deviations a value is above or below the mean.',
    topic: 'Statistics',
    repetitions: 0,
    interval_days: 1,
    easiness_factor: 2.5,
    dueAt: new Date().toISOString(),
  },
]

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { topic: 'Differentiation', confidence: 1 },
  { topic: 'Integration', confidence: 1 },
  { topic: 'Trigonometry', confidence: 0 },
  { topic: 'Vectors', confidence: 0 },
  { topic: 'Normal Distribution', confidence: 1 },
  { topic: 'Mechanics', confidence: 0 },
]

const BLITZ_PROMPTS = [
  'Differentiate ln(x² + 1).',
  'State the binomial expansion formula.',
  'Find the gradient of y = 3x² − 4x + 1 at x = 2.',
  'When do you use the chain rule?',
  'What is the mean of a normal distribution N(μ, σ²)?',
]

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function StudyClient({ initialTab = 'flashcards' }: StudyClientProps) {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<StudyTab>(initialTab)
  const [cards, setCards] = useState<Flashcard[]>(DEFAULT_CARDS)
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [topic, setTopic] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [blitzPrompt, setBlitzPrompt] = useState(BLITZ_PROMPTS[0])
  const [blitzScore, setBlitzScore] = useState({ correct: 0, attempts: 0 })

  useEffect(() => {
    const requested = searchParams.get('tab')
    if (requested === 'flashcards' || requested === 'blitz' || requested === 'checklist') {
      setTab(requested)
    }
  }, [searchParams])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedCards = window.localStorage.getItem(FLASHCARD_KEY)
    const savedChecklist = window.localStorage.getItem(CHECKLIST_KEY)
    if (savedCards) {
      try {
        setCards(JSON.parse(savedCards) as Flashcard[])
      } catch {
        // ignore bad local data
      }
    }
    if (savedChecklist) {
      try {
        setChecklist(JSON.parse(savedChecklist) as ChecklistItem[])
      } catch {
        // ignore bad local data
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FLASHCARD_KEY, JSON.stringify(cards))
    }
  }, [cards])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checklist))
    }
  }, [checklist])

  const dueCards = useMemo(() => {
    return cards.filter(card => new Date(card.dueAt).getTime() <= Date.now())
  }, [cards])

  const currentCard = dueCards[0] ?? cards[0] ?? null
  const confidentCount = checklist.filter(item => item.confidence === 2).length

  function addCard() {
    const trimmedFront = front.trim()
    const trimmedBack = back.trim()
    const trimmedTopic = topic.trim() || 'General'
    if (!trimmedFront || !trimmedBack) return

    setCards(prev => [{
      id: uid(),
      front: trimmedFront,
      back: trimmedBack,
      topic: trimmedTopic,
      repetitions: 0,
      interval_days: 1,
      easiness_factor: 2.5,
      dueAt: new Date().toISOString(),
    }, ...prev])

    setFront('')
    setBack('')
    setTopic('')
  }

  function rateCard(quality: number) {
    if (!currentCard) return

    const next = sm2Update({
      easiness_factor: currentCard.easiness_factor,
      interval_days: currentCard.interval_days,
      repetitions: currentCard.repetitions,
    }, quality)

    const nextDue = new Date(Date.now() + next.next_review_days * 24 * 60 * 60 * 1000).toISOString()

    setCards(prev => prev.map(card => (
      card.id === currentCard.id
        ? {
            ...card,
            easiness_factor: next.easiness_factor,
            interval_days: next.interval_days,
            repetitions: next.repetitions,
            dueAt: nextDue,
          }
        : card
    )))
    setShowAnswer(false)
  }

  function rollBlitz(correct: boolean) {
    setBlitzScore(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      attempts: prev.attempts + 1,
    }))
    const nextPrompt = BLITZ_PROMPTS[Math.floor(Math.random() * BLITZ_PROMPTS.length)]
    setBlitzPrompt(nextPrompt)
  }

  function updateConfidence(topicName: string, confidence: 0 | 1 | 2) {
    setChecklist(prev => prev.map(item => item.topic === topicName ? { ...item, confidence } : item))
  }

  return (
    <AuthPageShell
      title="Study Hub"
      subtitle="Flashcards, quick blitz drills, and a topic checklist"
      action={
        <Link
          href="/questions"
          className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
          style={{ background: '#4F8CFF' }}
        >
          Practice →
        </Link>
      }
    >
      <div className="space-y-6 max-w-6xl">
        <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-primary font-medium">Legacy study tools are now in Next.js</p>
              <h2 className="text-xl font-semibold text-foreground mt-1">Choose how you want to revise</h2>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'flashcards', label: 'Flashcards', icon: Layers3 },
                { id: 'blitz', label: 'Quick Blitz', icon: Sparkles },
                { id: 'checklist', label: 'Checklist', icon: ListChecks },
              ].map(item => {
                const Icon = item.icon
                const active = tab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id as StudyTab)}
                    className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    style={{
                      background: active ? 'rgba(79,140,255,0.14)' : 'rgba(255,255,255,0.04)',
                      color: active ? '#4F8CFF' : '#9AA4AF',
                      border: active ? '1px solid rgba(79,140,255,0.28)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {tab === 'flashcards' && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-4 gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Review queue</h3>
                  <p className="text-sm text-muted">{dueCards.length} card(s) due now</p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
                  SM-2 ready
                </span>
              </div>

              {currentCard ? (
                <div className="space-y-4">
                  <div className="rounded-xl p-5 min-h-[220px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-xs uppercase tracking-[0.14em] text-primary font-semibold mb-3">{currentCard.topic}</div>
                    <p className="text-lg font-medium text-foreground leading-relaxed">{currentCard.front}</p>
                    {showAnswer && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-sm text-muted leading-6">{currentCard.back}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setShowAnswer(v => !v)}
                      className="px-3 py-2 rounded-lg text-sm font-medium"
                      style={{ background: 'rgba(255,255,255,0.04)', color: '#E6EDF3', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      {showAnswer ? 'Hide answer' : 'Show answer'}
                    </button>
                    {[{ label: 'Again', quality: 1 }, { label: 'Hard', quality: 3 }, { label: 'Good', quality: 4 }, { label: 'Easy', quality: 5 }].map(item => (
                      <button
                        key={item.label}
                        onClick={() => rateCard(item.quality)}
                        className="px-3 py-2 rounded-lg text-sm font-medium"
                        style={{ background: 'rgba(79,140,255,0.1)', color: '#4F8CFF', border: '1px solid rgba(79,140,255,0.16)' }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl p-6 text-sm text-muted" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  No cards yet — add one below to start your deck.
                </div>
              )}
            </section>

            <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-lg font-semibold text-foreground mb-1">Add a flashcard</h3>
              <p className="text-sm text-muted mb-4">Turn any weak area into a spaced-repetition prompt.</p>
              <div className="space-y-3">
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Topic (e.g. Integration)"
                  className="w-full px-3 py-2.5 rounded-[10px] text-sm text-foreground outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <textarea
                  value={front}
                  onChange={e => setFront(e.target.value)}
                  rows={3}
                  placeholder="Front of card / prompt"
                  className="w-full px-3 py-2.5 rounded-[10px] text-sm text-foreground outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <textarea
                  value={back}
                  onChange={e => setBack(e.target.value)}
                  rows={4}
                  placeholder="Back of card / answer"
                  className="w-full px-3 py-2.5 rounded-[10px] text-sm text-foreground outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <button
                  onClick={addCard}
                  className="px-4 py-2.5 rounded-[10px] text-sm font-semibold text-white"
                  style={{ background: '#4F8CFF' }}
                >
                  Save flashcard
                </button>
              </div>
            </section>
          </div>
        )}

        {tab === 'blitz' && (
          <section className="rounded-card p-5 max-w-3xl" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">Quick Blitz</h3>
                <p className="text-sm text-muted">Five-second-style recall prompts for fast revision.</p>
              </div>
            </div>

            <div className="rounded-xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-xs uppercase tracking-[0.14em] text-primary font-semibold mb-2">Prompt</div>
              <p className="text-lg font-medium text-foreground">{blitzPrompt}</p>
            </div>

            <div className="flex gap-2 flex-wrap mb-5">
              <button
                onClick={() => rollBlitz(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                I got it
              </button>
              <button
                onClick={() => rollBlitz(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                Need help
              </button>
              <Link
                href={`/chat?q=${encodeURIComponent(blitzPrompt)}`}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(79,140,255,0.12)', color: '#4F8CFF', border: '1px solid rgba(79,140,255,0.2)' }}
              >
                Ask Jarvis
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="text-xs text-muted">Attempts</div>
                <div className="text-2xl font-semibold text-foreground mt-1">{blitzScore.attempts}</div>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="text-xs text-muted">Correct</div>
                <div className="text-2xl font-semibold text-foreground mt-1">{blitzScore.correct}</div>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="text-xs text-muted">Accuracy</div>
                <div className="text-2xl font-semibold text-foreground mt-1">
                  {blitzScore.attempts ? Math.round((blitzScore.correct / blitzScore.attempts) * 100) : 0}%
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === 'checklist' && (
          <section className="rounded-card p-5 max-w-4xl" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Topic checklist</h3>
                <p className="text-sm text-muted">Mark what still needs revision and what feels solid.</p>
              </div>
              <span className="text-sm font-medium text-primary">{confidentCount}/{checklist.length} confident</span>
            </div>

            <div className="space-y-3">
              {checklist.map(item => (
                <div
                  key={item.topic}
                  className="rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div>
                    <div className="text-sm font-semibold text-foreground">{item.topic}</div>
                    <div className="text-xs text-muted mt-1">Use this to drive your next plan or flashcard deck.</div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: 'Need revision', value: 0 },
                      { label: 'Getting there', value: 1 },
                      { label: 'Confident', value: 2 },
                    ].map(option => {
                      const active = item.confidence === option.value
                      return (
                        <button
                          key={option.label}
                          onClick={() => updateConfidence(item.topic, option.value as 0 | 1 | 2)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{
                            background: active ? 'rgba(79,140,255,0.12)' : 'rgba(255,255,255,0.04)',
                            color: active ? '#4F8CFF' : '#9AA4AF',
                            border: active ? '1px solid rgba(79,140,255,0.22)' : '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AuthPageShell>
  )
}
