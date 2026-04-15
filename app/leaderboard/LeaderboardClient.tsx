'use client'

import { useEffect, useState } from 'react'
import { Trophy, Medal, Crown, Zap, Flame } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'
import { useAuth } from '@/lib/useAuth'

type Tab = 'weekly' | 'alltime' | 'streak'

interface LeaderEntry {
  name: string
  xp: number
  streak: number
  avatar_emoji?: string
}

const MEDAL_COLOURS = ['#FFD700', '#C0C0C0', '#CD7F32']

export default function LeaderboardClient() {
  const { token } = useAuth()
  const [tab, setTab] = useState<Tab>('alltime')
  const [entries, setEntries] = useState<LeaderEntry[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'leaderboard', payload: { tab } }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setEntries(data.top || [])
          setUserRank(data.userRank ?? null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, tab])

  const sortedEntries = tab === 'streak'
    ? [...entries].sort((a, b) => b.streak - a.streak)
    : [...entries].sort((a, b) => b.xp - a.xp)

  return (
    <AuthPageShell title="Leaderboard" subtitle="See how you rank against other Synaptiq learners">
      {/* Tab bar */}
      <div className="flex gap-2 mb-6">
        {(['alltime', 'weekly', 'streak'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={tab === t
              ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }
              : { background: 'rgba(255,255,255,0.04)', color: '#6B7394', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {t === 'alltime' ? 'All Time' : t === 'weekly' ? 'This Week' : 'Streaks'}
          </button>
        ))}
      </div>

      <div className="max-w-xl">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : sortedEntries.length === 0 ? (
          <div className="text-center py-16" style={{ color: '#6B7394' }}>
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No data yet</p>
            <p className="text-sm mt-1">Be the first to earn XP and appear here!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedEntries.map((entry, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl"
                style={{
                  background: i === 0
                    ? 'rgba(201,168,76,0.08)'
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${i === 0 ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {/* Rank */}
                <div className="w-8 text-center flex-shrink-0">
                  {i < 3 ? (
                    <Medal className="w-5 h-5 mx-auto" style={{ color: MEDAL_COLOURS[i] }} />
                  ) : (
                    <span className="text-sm font-bold" style={{ color: '#6B7394' }}>#{i + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  {entry.avatar_emoji || '🎓'}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{entry.name || 'Student'}</p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs flex-shrink-0">
                  <span className="flex items-center gap-1" style={{ color: '#C9A84C' }}>
                    <Zap className="w-3.5 h-3.5" />
                    {entry.xp.toLocaleString()} XP
                  </span>
                  {entry.streak > 0 && (
                    <span className="flex items-center gap-1" style={{ color: '#FB923C' }}>
                      <Flame className="w-3.5 h-3.5" />
                      {entry.streak}d
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Your rank */}
        {userRank !== null && (
          <div
            className="mt-4 px-4 py-3 rounded-xl text-sm text-center"
            style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', color: '#00D4FF' }}
          >
            <Crown className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            You are ranked <strong>#{userRank}</strong> overall
          </div>
        )}
      </div>
    </AuthPageShell>
  )
}
