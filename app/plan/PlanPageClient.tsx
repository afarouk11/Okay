'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, RefreshCw, Sparkles, Trophy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import PlanCard, { type PlanTask } from '@/components/PlanCard'
import { useAuth } from '@/lib/useAuth'

type DailyPlan = {
  id: string
  date: string
  tasks: PlanTask[]
}

export default function PlanPageClient() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useAuth()
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const fetchPlan = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/plan', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setPlan(data.plan ?? null)
    } catch {
      // no-op
    } finally {
      setLoading(false)
    }
  }, [])

  const generatePlan = useCallback(async () => {
    if (!token) return
    setGenerating(true)
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      setPlan(data.plan ?? null)
    } catch {
      // no-op
    } finally {
      setGenerating(false)
    }
  }, [])

  const toggleTask = useCallback(
    async (taskId: string, done: boolean) => {
      if (!plan) return

      // Optimistic update
      setPlan(prev =>
        prev
          ? { ...prev, tasks: prev.tasks.map(t => (t.id === taskId ? { ...t, done } : t)) }
          : null,
      )

      try {
        await fetch('/api/plan', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ taskId, done }),
        })
      } catch {
        // revert on error
        setPlan(prev =>
          prev
            ? { ...prev, tasks: prev.tasks.map(t => (t.id === taskId ? { ...t, done: !done } : t)) }
            : null,
        )
      }
    },
    [plan, token],
  )

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  // Fetch plan once token is available
  useEffect(() => {
    if (token) fetchPlan()
  }, [token, fetchPlan])

  const completedCount = plan?.tasks.filter(t => t.done).length ?? 0
  const totalCount = plan?.tasks.length ?? 0
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const allDone = totalCount > 0 && completedCount === totalCount

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
        <Header title="Daily Plan" subtitle={today} />

        <main className="flex-1 px-8 py-6 max-w-2xl">
          {/* Hero card */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-card p-6 mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(79,140,255,0.08), rgba(34,197,94,0.05))',
              border: '1px solid rgba(79,140,255,0.15)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'rgba(79,140,255,0.12)',
                    border: '1px solid rgba(79,140,255,0.25)',
                  }}
                >
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground tracking-tight">
                    Your Plan Today
                  </h2>
                  <p className="text-sm text-muted mt-0.5">
                    {plan
                      ? `${completedCount} of ${totalCount} tasks complete`
                      : 'Generate your personalised study plan'}
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={generatePlan}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-medium text-white flex-shrink-0 disabled:opacity-60"
                style={{ background: '#4F8CFF' }}
              >
                {generating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {plan ? 'Regenerate' : 'Generate Plan'}
              </motion.button>
            </div>

            {/* Progress bar */}
            {plan && totalCount > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted font-medium">Progress</span>
                  <span className="text-xs text-muted">{Math.round(progress)}%</span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: allDone ? '#22C55E' : '#4F8CFF' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* Task list */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="h-[76px] rounded-card animate-pulse"
                    style={{
                      background: 'rgba(18,24,33,0.6)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  />
                ))}
              </motion.div>
            ) : !plan ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-card p-10 flex flex-col items-center justify-center text-center"
                style={{
                  background: 'rgba(18,24,33,0.5)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <CalendarDays className="w-10 h-10 mb-4" style={{ color: 'rgba(154,164,175,0.3)' }} />
                <h3 className="text-base font-semibold text-foreground mb-2">No plan yet</h3>
                <p className="text-sm text-muted max-w-xs">
                  Jarvis will create a personalised study plan based on your weak areas and goals.
                </p>
              </motion.div>
            ) : allDone ? (
              <motion.div
                key="all-done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-card p-8 flex flex-col items-center text-center mb-4 space-y-3"
                style={{
                  background: 'rgba(34,197,94,0.05)',
                  border: '1px solid rgba(34,197,94,0.2)',
                }}
              >
                <Trophy className="w-10 h-10 text-accent" />
                <h3 className="text-lg font-semibold text-foreground">Plan complete! 🎉</h3>
                <p className="text-sm text-muted">Outstanding work. All tasks done for today.</p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Always render tasks even when allDone so user can uncheck */}
          {plan && !loading && (
            <div className="space-y-3 mt-3">
              {plan.tasks.map((task, i) => (
                <PlanCard key={task.id} task={task} index={i} onToggle={toggleTask} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
