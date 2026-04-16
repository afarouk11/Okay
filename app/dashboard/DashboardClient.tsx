'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles, Zap, Target, BookOpen, TrendingUp, ArrowRight,
  Flame, CalendarDays, FileText, HelpCircle, MessageSquare,
  BarChart2, Clock, CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/lib/useAuth'

type Activity = { date: string; questions_done: number; xp_earned: number }
type ProgressData = {
  profile: { name: string | null; xp: number; level: number; plan: string; exam_date?: string | null } | null
  progress: Array<{ topic: string }> | null
  mistakes: Array<{ topic: string }> | null
  activity: Activity[] | null
}

function calcStreak(activity: Activity[]): number {
  if (!activity.length) return 0
  const today = new Date().toISOString().split('T')[0]
  const dates = new Set(activity.map(a => a.date))
  let streak = 0
  const cur = new Date()
  if (!dates.has(today)) cur.setDate(cur.getDate() - 1)
  while (dates.has(cur.toISOString().split('T')[0])) {
    streak++
    cur.setDate(cur.getDate() - 1)
  }
  return streak
}

function daysUntilExam(examDate: string | null | undefined): number | null {
  if (!examDate) return null
  try {
    const diff = new Date(examDate).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / 86_400_000))
  } catch { return null }
}

const quickActions = [
  { href: '/jarvis',    icon: Sparkles,     label: 'J.A.R.V.I.S.',   sub: 'AI step-by-step tutor',    accent: '#C9A84C' },
  { href: '/questions', icon: HelpCircle,   label: 'Practice Qs',     sub: 'Exam-style questions',     accent: '#00D4FF' },
  { href: '/plan',      icon: CalendarDays, label: "Today's Plan",    sub: 'Your daily study tasks',   accent: '#00FF9D' },
  { href: '/papers',    icon: FileText,     label: 'Past Papers',     sub: 'Official board questions', accent: '#B060FF' },
  { href: '/study',     icon: BookOpen,     label: 'Study Hub',       sub: 'Explore topics & modules', accent: '#FF6B35' },
  { href: '/blitz',     icon: Zap,          label: 'Quick Blitz',     sub: '5-question rapid round',   accent: '#FF4060' },
]

function StatPill({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string | number; accent: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
         style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
           style={{ background: `${accent}18` }}>
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-[13px] font-bold text-white leading-none">{value}</p>
        <p className="text-[11px] mt-0.5" style={{ color: '#5A7499' }}>{label}</p>
      </div>
    </div>
  )
}

function ActivityRow({ date, questions_done, xp_earned }: Activity) {
  const label = (() => {
    try {
      return new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    } catch { return date }
  })()
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0"
         style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ background: 'rgba(0,212,255,0.08)' }}>
          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#00D4FF' }} />
        </div>
        <span className="text-[13px] text-white">{label}</span>
      </div>
      <div className="flex items-center gap-4 text-[12px]">
        <span style={{ color: '#5A7499' }}>{questions_done} q</span>
        <span className="font-semibold" style={{ color: '#C9A84C' }}>+{xp_earned} XP</span>
      </div>
    </div>
  )
}

export default function DashboardClient() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useAuth()
  const [data, setData]           = useState<ProgressData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [greeting, setGreeting]   = useState('Good morning')
  const [todayLabel, setTodayLabel] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening')
    setTodayLabel(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))
  }, [])

  useEffect(() => { if (!authLoading && !user) router.replace('/login') }, [authLoading, user, router])

  const fetchStats = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const r = await fetch('/api/progress', { headers: { Authorization: `Bearer ${token}` } })
      if (r.ok) setData(await r.json())
    } catch { /* no-op */ }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { if (token) fetchStats() }, [token, fetchStats])

  if (authLoading) return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: '#050810' }}>
      <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
           style={{ borderColor: '#C9A84C', borderTopColor: 'transparent' }} />
    </div>
  )
  if (!user) return null

  const profile      = data?.profile
  const firstName    = profile?.name?.split(' ')[0] ?? 'there'
  const xp           = profile?.xp ?? 0
  const level        = profile?.level ?? 1
  const xpPerLevel   = 500
  const xpProgress   = Math.min((xp % xpPerLevel) / xpPerLevel, 1)
  const streak       = calcStreak(data?.activity ?? [])
  const topicCount   = data ? new Set([
    ...(data.progress ?? []).map(p => p.topic),
    ...(data.mistakes ?? []).map(m => m.topic),
  ]).size : 0
  const totalQs      = (data?.activity ?? []).reduce((s, a) => s + (a.questions_done ?? 0), 0)
  const examDays     = daysUntilExam(profile?.exam_date)
  const recentActivity = (data?.activity ?? []).slice(0, 6)

  return (
    <div className="flex min-h-screen" style={{ background: '#050810' }}>
      <Sidebar />

      <main style={{ flex: 1, marginLeft: 225, minHeight: '100vh' }}>
        {/* Top bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-8 h-[60px]"
             style={{ background: 'rgba(5,8,16,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <p className="text-[13px] font-medium text-white">{greeting}, {firstName}</p>
            <p className="text-[11px]" style={{ color: '#5A7499' }}>{todayLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {examDays !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                   style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                <Clock className="w-3 h-3" />
                {examDays}d to exam
              </div>
            )}
            {streak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                   style={{ background: 'rgba(255,107,53,0.12)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.2)' }}>
                <Flame className="w-3 h-3" />
                {streak} day streak
              </div>
            )}
          </div>
        </div>

        <div className="px-8 py-6 space-y-7 max-w-[1100px]">

          {/* Hero banner */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-2xl overflow-hidden px-7 py-6"
            style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.14) 0%, rgba(0,212,255,0.08) 60%, rgba(176,96,255,0.06) 100%)',
              border: '1px solid rgba(201,168,76,0.18)',
            }}
          >
            <div className="flex items-center justify-between gap-6">
              <div className="max-w-lg">
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: '#C9A84C' }}>
                  A-Level Maths · AI Tutor
                </p>
                <h1 className="text-[22px] font-bold text-white leading-snug">
                  What would you like to work on today?
                </h1>
                <p className="mt-2 text-[13px] leading-relaxed" style={{ color: '#7A94B8' }}>
                  Ask Jarvis anything — full working shown step by step, tailored to your exact exam board.
                </p>
              </div>
              <Link href="/jarvis" className="flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-[13px] font-bold"
                  style={{ background: 'linear-gradient(135deg, #C9A84C, #D4B86A)', color: '#050810' }}
                >
                  <Sparkles className="w-4 h-4" />
                  Open Jarvis
                </motion.button>
              </Link>
            </div>

            {/* XP bar inside hero */}
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex justify-between mb-1.5">
                <span className="text-[11px] font-medium" style={{ color: '#7A94B8' }}>
                  Level {level} — {xp % xpPerLevel} / {xpPerLevel} XP to next level
                </span>
                <span className="text-[11px] font-bold" style={{ color: '#C9A84C' }}>Lv {level + 1} →</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #C9A84C, #D4B86A)' }}
                />
              </div>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            <StatPill icon={Zap}          label="Total XP"       value={loading ? '…' : xp}          accent="#C9A84C" />
            <StatPill icon={HelpCircle}   label="Questions Done" value={loading ? '…' : totalQs}      accent="#00D4FF" />
            <StatPill icon={Target}       label="Topics Covered" value={loading ? '…' : topicCount}   accent="#00FF9D" />
            <StatPill icon={Flame}        label="Day Streak"     value={loading ? '…' : streak}       accent="#FF6B35" />
          </motion.div>

          {/* Quick actions */}
          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] mb-3" style={{ color: '#5A7499' }}>
              Quick Access
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {quickActions.map((a, i) => {
                const Icon = a.icon
                return (
                  <Link key={a.href} href={a.href}>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.05 * i }}
                      whileHover={{ y: -2, transition: { duration: 0.15 } }}
                      className="group flex items-center gap-3.5 px-4 py-4 rounded-2xl cursor-pointer"
                      style={{
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                           style={{ background: `${a.accent}14`, border: `1px solid ${a.accent}28` }}>
                        <Icon className="w-5 h-5" style={{ color: a.accent }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white group-hover:text-[#C9A84C] transition-colors truncate">
                          {a.label}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: '#5A7499' }}>{a.sub}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ color: '#C9A84C' }} />
                    </motion.div>
                  </Link>
                )
              })}
            </div>
          </section>

          {/* Bottom two-col: activity + weak topics */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Recent activity */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="lg:col-span-3 rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-bold text-white">Recent Activity</h2>
                <BarChart2 className="w-4 h-4" style={{ color: '#5A7499' }} />
              </div>
              {recentActivity.length > 0 ? (
                <div>
                  {recentActivity.map(a => <ActivityRow key={a.date} {...a} />)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <TrendingUp className="w-7 h-7 mb-3" style={{ color: '#2A3A55' }} />
                  <p className="text-[13px]" style={{ color: '#5A7499' }}>No activity yet</p>
                  <p className="text-[11px] mt-1" style={{ color: '#3D5470' }}>Complete questions to track progress</p>
                </div>
              )}
            </motion.div>

            {/* Weak topics */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="lg:col-span-2 rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-bold text-white">Focus Areas</h2>
                <Target className="w-4 h-4" style={{ color: '#5A7499' }} />
              </div>
              {(data?.mistakes ?? []).length > 0 ? (
                <div className="space-y-2">
                  {[...new Set((data!.mistakes ?? []).map(m => m.topic))].slice(0, 5).map(topic => (
                    <div key={topic}
                         className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                         style={{ background: 'rgba(255,96,64,0.06)', border: '1px solid rgba(255,96,64,0.12)' }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF6040] flex-shrink-0" />
                      <span className="text-[12px] text-white truncate">{topic}</span>
                    </div>
                  ))}
                  <Link href="/mistakes">
                    <p className="text-[11px] mt-2 hover:text-[#C9A84C] transition-colors"
                       style={{ color: '#5A7499' }}>View all mistakes →</p>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-7 h-7 mb-3" style={{ color: '#2A3A55' }} />
                  <p className="text-[13px]" style={{ color: '#5A7499' }}>No mistakes logged</p>
                  <p className="text-[11px] mt-1" style={{ color: '#3D5470' }}>Keep practising to track weak spots</p>
                </div>
              )}
            </motion.div>
          </div>

        </div>
      </main>
    </div>
  )
}
