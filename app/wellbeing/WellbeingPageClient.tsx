'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { HeartPulse, TimerReset, Timer } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'

type WellbeingTab = 'overview' | 'pomodoro'

function formatClock(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const secs = (totalSeconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

export default function WellbeingPageClient() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<WellbeingTab>('overview')
  const [mood, setMood] = useState(3)
  const [note, setNote] = useState('')
  const [sessionMinutes, setSessionMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)

  useEffect(() => {
    const requested = searchParams.get('tab')
    if (requested === 'overview' || requested === 'pomodoro') setTab(requested)
  }, [searchParams])

  useEffect(() => {
    if (!running) setSecondsLeft(sessionMinutes * 60)
  }, [sessionMinutes, running])

  useEffect(() => {
    if (!running) return

    const id = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(id)
          setRunning(false)
          setCompletedSessions(count => count + 1)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(id)
  }, [running])

  const moodLabel = useMemo(() => {
    if (mood <= 2) return 'Take it gently today'
    if (mood === 3) return 'Steady and manageable'
    return 'You are in a strong place to focus'
  }, [mood])

  return (
    <AuthPageShell
      title="Wellbeing"
      subtitle="Keep your focus sustainable with mood check-ins and pomodoro blocks"
      action={
        <Link href="/plan" className="px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#4F8CFF' }}>
          Open plan →
        </Link>
      }
    >
      <div className="space-y-6 max-w-6xl">
        <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-primary font-medium">Legacy wellbeing tools, now in Next.js</p>
              <h2 className="text-xl font-semibold text-foreground mt-1">Protect your focus while you revise</h2>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'overview', label: 'Check-in' },
                { id: 'pomodoro', label: 'Pomodoro' },
              ].map(item => {
                const active = tab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id as WellbeingTab)}
                    className="px-3 py-2 rounded-lg text-sm font-medium"
                    style={{
                      background: active ? 'rgba(79,140,255,0.14)' : 'rgba(255,255,255,0.04)',
                      color: active ? '#4F8CFF' : '#9AA4AF',
                      border: active ? '1px solid rgba(79,140,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {tab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 mb-4">
                <HeartPulse className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Mood check-in</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted block mb-2">How are you feeling right now?</label>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5].map(value => (
                      <button
                        key={value}
                        onClick={() => setMood(value)}
                        className="w-11 h-11 rounded-full text-sm font-semibold"
                        style={{
                          background: mood === value ? 'rgba(79,140,255,0.16)' : 'rgba(255,255,255,0.04)',
                          color: mood === value ? '#4F8CFF' : '#E6EDF3',
                          border: mood === value ? '1px solid rgba(79,140,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-sm font-semibold text-foreground mb-1">Today&apos;s wellbeing note</div>
                  <p className="text-sm text-muted">{moodLabel}</p>
                </div>

                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={4}
                  placeholder="What would help you focus better in the next study block?"
                  className="w-full px-3 py-2.5 rounded-[10px] text-sm text-foreground outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            </section>

            <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-lg font-semibold text-foreground mb-4">Quick reset ideas</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  'Work in one 25-minute block, then take a full 5-minute stand-up break.',
                  'Close every extra tab and only keep your question plus one reference source open.',
                  'Start with a weak topic you can improve quickly to build momentum.',
                  'If you feel stuck, ask Jarvis for the next single step instead of the whole solution.',
                ].map(tip => (
                  <div key={tip} className="rounded-xl p-4 text-sm text-muted leading-6" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {tip}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'pomodoro' && (
          <section className="rounded-card p-5 max-w-4xl" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Timer className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Pomodoro timer</h3>
            </div>

            <div className="grid gap-6 md:grid-cols-[0.8fr_1.1fr]">
              <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xs uppercase tracking-[0.14em] text-primary font-semibold mb-2">Focus timer</div>
                <div className="text-5xl font-black text-foreground mb-4">{formatClock(secondsLeft)}</div>
                <div className="flex gap-2 justify-center flex-wrap mb-4">
                  {[25, 45, 60].map(minutes => (
                    <button
                      key={minutes}
                      onClick={() => setSessionMinutes(minutes)}
                      className="px-3 py-2 rounded-lg text-sm font-medium"
                      style={{
                        background: sessionMinutes === minutes ? 'rgba(79,140,255,0.14)' : 'rgba(255,255,255,0.04)',
                        color: sessionMinutes === minutes ? '#4F8CFF' : '#9AA4AF',
                        border: sessionMinutes === minutes ? '1px solid rgba(79,140,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 justify-center flex-wrap">
                  <button onClick={() => setRunning(value => !value)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#4F8CFF' }}>
                    {running ? 'Pause' : 'Start'}
                  </button>
                  <button onClick={() => { setRunning(false); setSecondsLeft(sessionMinutes * 60) }} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.04)', color: '#E6EDF3' }}>
                    Reset
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-sm font-semibold text-foreground mb-1">Completed sessions</div>
                  <p className="text-2xl font-black text-foreground">{completedSessions}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-sm font-semibold text-foreground mb-2">During the break</div>
                  <ul className="space-y-2 text-sm text-muted">
                    <li>• Stand up and look away from the screen.</li>
                    <li>• Drink water before starting the next block.</li>
                    <li>• Decide the next exact question before the timer resumes.</li>
                  </ul>
                </div>
                <Link href="/questions" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.18)' }}>
                  <TimerReset className="w-4 h-4" />
                  Start a practice set →
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </AuthPageShell>
  )
}
