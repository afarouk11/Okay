'use client'

import { motion } from 'framer-motion'
import {
  MessageSquare,
  Zap,
  Target,
  BookOpen,
  TrendingUp,
  ArrowRight,
  Flame,
  CalendarDays,
} from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import StatsCard from '@/components/StatsCard'

const stats = [
  { icon: Zap,           label: 'XP Earned',      value: '0', color: 'blue'   as const, delay: 0.1 },
  { icon: MessageSquare, label: 'Messages Sent',   value: '0', color: 'green'  as const, delay: 0.2 },
  { icon: Target,        label: 'Topics Covered',  value: '0', color: 'purple' as const, delay: 0.3 },
  { icon: Flame,         label: 'Day Streak',      value: '0', color: 'orange' as const, delay: 0.4 },
]

const quickActions = [
  { href: '/chat',    icon: MessageSquare, label: 'Ask Jarvis',     sub: 'Start a tutoring session', color: '#4F8CFF' },
  { href: '/plan',    icon: CalendarDays,  label: "Today's Plan",   sub: 'See your daily tasks',     color: '#22C55E' },
  { href: '/lessons', icon: BookOpen,      label: 'Browse Lessons', sub: 'Explore topics',           color: '#8B5CF6' },
]

export default function DashboardClient() {
  return (
    <div className="flex min-h-screen" style={{ background: '#0B0F14' }}>
      <Sidebar />

      {/* Main */}
      <div className="flex-1 flex flex-col ml-60">
        <Header
          title="Dashboard"
          subtitle={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        />

        <main className="flex-1 px-8 py-6 space-y-8">
          {/* Welcome */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-card p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(79,140,255,0.08) 0%, rgba(34,197,94,0.05) 100%)',
              border: '1px solid rgba(79,140,255,0.15)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary mb-1">Welcome back 👋</p>
                <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                  Ready to learn something today?
                </h2>
                <p className="text-muted mt-1.5 text-sm max-w-md">
                  Jarvis is here to guide you. Ask anything, explore topics, or follow your daily plan.
                </p>
              </div>
              <Link href="/chat">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-medium text-white transition-all"
                  style={{ background: '#4F8CFF' }}
                >
                  Talk to Jarvis
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <section>
            <h3 className="text-sm font-medium text-muted uppercase tracking-widest mb-4">Your Stats</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((s) => (
                <StatsCard key={s.label} {...s} />
              ))}
            </div>
          </section>

          {/* Quick Actions */}
          <section>
            <h3 className="text-sm font-medium text-muted uppercase tracking-widest mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action, i) => {
                const Icon = action.icon
                return (
                  <Link key={action.href} href={action.href}>
                    <motion.div
                      initial={{ y: 16, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ y: -2, transition: { duration: 0.2 } }}
                      className="rounded-card p-5 flex items-center gap-4 cursor-pointer group"
                      style={{
                        background: 'rgba(18,24,33,0.8)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${action.color}15`, border: `1px solid ${action.color}30` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: action.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {action.label}
                        </p>
                        <p className="text-xs text-muted mt-0.5">{action.sub}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  </Link>
                )
              })}
            </div>
          </section>

          {/* Recent Activity (placeholder) */}
          <section>
            <h3 className="text-sm font-medium text-muted uppercase tracking-widest mb-4">Recent Activity</h3>
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-card p-8 flex flex-col items-center justify-center text-center"
              style={{
                background: 'rgba(18,24,33,0.5)',
                border: '1px solid rgba(255,255,255,0.05)',
                minHeight: '140px',
              }}
            >
              <TrendingUp className="w-8 h-8 text-muted/40 mb-3" />
              <p className="text-sm text-muted">No activity yet. Start a chat with Jarvis!</p>
              <Link href="/chat">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="mt-4 px-4 py-2 rounded-lg text-xs font-medium text-primary border border-primary/20 hover:bg-primary/10 transition-colors"
                >
                  Begin learning →
                </motion.button>
              </Link>
            </motion.div>
          </section>
        </main>
      </div>
    </div>
  )
}
