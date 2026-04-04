'use client'

import { motion } from 'framer-motion'
import { Settings, User, Bell, Shield, Palette, CreditCard, ChevronRight } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

const SETTINGS_SECTIONS = [
  {
    title: 'Account',
    icon: User,
    color: '#4F8CFF',
    items: [
      { label: 'Display name', value: 'Student', type: 'text' as const },
      { label: 'Email address', value: 'student@example.com', type: 'text' as const },
      { label: 'Year group', value: 'Year 13', type: 'text' as const },
      { label: 'Exam board', value: 'AQA', type: 'text' as const },
      { label: 'Target grade', value: 'A*', type: 'text' as const },
    ],
  },
  {
    title: 'Accessibility',
    icon: Palette,
    color: '#22C55E',
    items: [
      { label: 'ADHD mode', value: 'Off', type: 'toggle' as const },
      { label: 'Dyslexia mode', value: 'Off', type: 'toggle' as const },
      { label: 'Dyscalculia mode', value: 'Off', type: 'toggle' as const },
    ],
  },
  {
    title: 'Notifications',
    icon: Bell,
    color: '#f59e0b',
    items: [
      { label: 'Daily study reminders', value: 'On', type: 'toggle' as const },
      { label: 'Streak alerts', value: 'On', type: 'toggle' as const },
      { label: 'Weekly progress report', value: 'Off', type: 'toggle' as const },
    ],
  },
  {
    title: 'Privacy & Security',
    icon: Shield,
    color: '#8B5CF6',
    items: [
      { label: 'Save chat history', value: 'On', type: 'toggle' as const },
      { label: 'Usage analytics', value: 'On', type: 'toggle' as const },
    ],
  },
  {
    title: 'Subscription',
    icon: CreditCard,
    color: '#ef4444',
    items: [
      { label: 'Current plan', value: 'Free', type: 'text' as const },
    ],
  },
]

export default function SettingsClient() {
  return (
    <div className="flex min-h-screen" style={{ background: '#0B0F14' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col ml-60">
        <Header title="Settings" subtitle="Manage your account and preferences" />

        <main className="flex-1 px-8 py-6 max-w-2xl space-y-4">
          {SETTINGS_SECTIONS.map((section, si) => {
            const Icon = section.icon
            return (
              <motion.div
                key={section.title}
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: si * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-card overflow-hidden"
                style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Section header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${section.color}15`, border: `1px solid ${section.color}30` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: section.color }} />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                </div>

                {/* Items */}
                <div className="divide-y divide-white/[0.04]">
                  {section.items.map(item => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between px-5 py-3.5 group hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <span className="text-sm text-muted group-hover:text-foreground transition-colors">
                        {item.label}
                      </span>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="text-sm font-medium"
                          style={{
                            color: item.type === 'toggle'
                              ? item.value === 'On' ? '#22C55E' : '#9AA4AF'
                              : '#9AA4AF',
                          }}
                        >
                          {item.value}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted/30" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}

          {/* Danger zone */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: SETTINGS_SECTIONS.length * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-card p-5 flex items-center justify-between"
            style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            <div>
              <p className="text-sm font-medium text-foreground">Delete account</p>
              <p className="text-xs text-muted mt-0.5">Permanently delete your account and all data</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444',
              }}
            >
              Delete
            </motion.button>
          </motion.div>
        </main>
      </div>
    </div>
  )
}
