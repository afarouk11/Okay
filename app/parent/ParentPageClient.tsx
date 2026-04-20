'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ActivityRow {
  date: string
  questions_done: number
  xp_earned: number
}

interface TopicRow {
  topic: string
  count: number
}

interface ChildProfile {
  name: string
  plan: string
  last_active: string | null
  accuracy: number | null
  streak: number | null
  xp: number | null
  level: number | null
  exam_date: string | null
}

interface DashboardData {
  profile: ChildProfile
  weekly: { xp: number; questions: number; days_active: number }
  topics: TopicRow[]
  activity: ActivityRow[]
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  const today = new Date()
  const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff} days ago`
}

function getLast7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

export default function ParentPageClient() {
  const [childEmail, setChildEmail] = useState('')
  const [parentCode, setParentCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<DashboardData | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parent_view', child_email: childEmail, parent_code: parentCode }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Access denied')
      } else {
        setData(json as DashboardData)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: '#0B0F14' }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-8"
          style={{
            background: 'rgba(18,24,33,0.9)',
            border: '1px solid rgba(201,168,76,0.2)',
            boxShadow: '0 0 40px rgba(201,168,76,0.05)',
          }}
        >
          <div className="text-center mb-8">
            <span className="text-4xl">🏠</span>
            <h1 className="mt-3 text-2xl font-bold text-white">Parent Access</h1>
            <p className="mt-1 text-sm" style={{ color: '#8B949E' }}>
              View your child&apos;s learning progress
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B949E' }}>
                Child&apos;s Email Address
              </label>
              <input
                type="email"
                required
                value={childEmail}
                onChange={(e) => setChildEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B949E' }}>
                6-Character Access Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={parentCode}
                onChange={(e) => setParentCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="w-full rounded-lg px-4 py-2.5 text-sm text-white outline-none tracking-widest font-mono uppercase"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{ background: '#C9A84C', color: '#0B0F14' }}
            >
              {loading ? 'Checking…' : 'Access Dashboard'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs" style={{ color: '#8B949E' }}>
            Your child can set their access code in{' '}
            <span style={{ color: '#C9A84C' }}>Settings</span>
          </p>
        </div>
      </div>
    )
  }

  const { profile, weekly, topics, activity } = data
  const last7Days = getLast7Days()
  const activityMap: Record<string, ActivityRow> = {}
  for (const row of activity) {
    activityMap[row.date] = row
  }
  const maxXp = Math.max(1, ...last7Days.map((d) => activityMap[d]?.xp_earned ?? 0))
  const examDays = profile.exam_date ? daysUntil(profile.exam_date) : null

  const planColors: Record<string, string> = {
    premium: '#C9A84C',
    pro: '#4F8CFF',
    student: '#22C55E',
  }
  const planColor = planColors[profile.plan?.toLowerCase()] ?? '#8B949E'

  return (
    <div className="min-h-screen" style={{ background: '#0B0F14' }}>
      {/* Header bar */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
        style={{ background: 'rgba(11,15,20,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🏠</span>
          <span className="font-semibold text-white">Parent Dashboard</span>
        </div>
        <button
          onClick={() => setData(null)}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#8B949E' }}
        >
          Log out
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Child header card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'rgba(18,24,33,0.9)',
            border: '1px solid rgba(201,168,76,0.15)',
          }}
        >
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold text-white">{profile.name || 'Student'}</h2>
              <p className="text-sm mt-0.5" style={{ color: '#8B949E' }}>
                Last active: {formatLastActive(profile.last_active)}
              </p>
            </div>
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide"
              style={{ background: `${planColor}22`, color: planColor, border: `1px solid ${planColor}44` }}
            >
              {profile.plan || 'student'}
            </span>
          </div>

          {examDays !== null && (
            <div
              className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}
            >
              <span className="text-lg">📅</span>
              <div>
                <p className="text-xs font-medium" style={{ color: '#C9A84C' }}>Exam Countdown</p>
                <p className="text-sm text-white">
                  {examDays > 0 ? `${examDays} days until exam` : examDays === 0 ? 'Exam is today!' : 'Exam date has passed'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'XP This Week', value: weekly.xp.toLocaleString(), icon: '⚡', color: '#C9A84C' },
            { label: 'Questions Done', value: weekly.questions.toLocaleString(), icon: '✅', color: '#4F8CFF' },
            { label: 'Days Active', value: `${weekly.days_active}/7`, icon: '🗓️', color: '#22C55E' },
            { label: 'Streak', value: `${profile.streak ?? 0} days`, icon: '🔥', color: '#F97316' },
            { label: 'Accuracy', value: profile.accuracy != null ? `${profile.accuracy}%` : '—', icon: '🎯', color: '#8B5CF6' },
            { label: 'Level', value: profile.level ?? '—', icon: '🏆', color: '#C9A84C' },
          ].map(({ label, value, icon, color }) => (
            <div
              key={label}
              className="rounded-xl p-4"
              style={{
                background: 'rgba(18,24,33,0.9)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span>{icon}</span>
                <span className="text-xs" style={{ color: '#8B949E' }}>{label}</span>
              </div>
              <p className="text-xl font-bold" style={{ color }}>{String(value)}</p>
            </div>
          ))}
        </div>

        {/* 7-day activity chart */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'rgba(18,24,33,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h3 className="text-sm font-semibold text-white mb-4">7-Day Activity</h3>
          <div className="flex items-end gap-2 h-24">
            {last7Days.map((day) => {
              const row = activityMap[day]
              const xp = row?.xp_earned ?? 0
              const heightPct = maxXp > 0 ? Math.max(4, (xp / maxXp) * 100) : 4
              const shortDay = new Date(day + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' })
              return (
                <div key={day} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${heightPct}%`,
                      background: xp > 0 ? '#C9A84C' : 'rgba(255,255,255,0.06)',
                      minHeight: 4,
                    }}
                    title={xp > 0 ? `${xp} XP` : 'No activity'}
                  />
                  <span className="text-xs" style={{ color: '#8B949E', fontSize: 10 }}>{shortDay}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top topics */}
        {topics.length > 0 && (
          <div
            className="rounded-2xl p-6"
            style={{ background: 'rgba(18,24,33,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <h3 className="text-sm font-semibold text-white mb-4">Top Topics This Week</h3>
            <div className="flex flex-col gap-3">
              {topics.map(({ topic, count }, i) => (
                <div key={topic} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold w-5 text-center" style={{ color: '#C9A84C' }}>
                      {i + 1}
                    </span>
                    <span className="text-sm text-white">{topic}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(79,140,255,0.1)', color: '#4F8CFF' }}>
                    {count} session{count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs pb-4" style={{ color: '#8B949E' }}>
          Powered by{' '}
          <Link href="/" style={{ color: '#C9A84C' }} className="hover:underline">
            Synapnode
          </Link>
        </p>
      </div>
    </div>
  )
}
