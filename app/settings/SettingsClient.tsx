'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, User, Bell, Shield, Palette, CreditCard, Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { useAuth } from '@/lib/useAuth'

type ProfileData = {
  name: string | null
  email: string
  year: string | null
  board: string
  target: string | null
  plan: string
  adhd_mode: boolean
  dyslexia_mode: boolean
  dyscalculia_mode: boolean
}

type NotifPrefs = {
  daily_reminders: boolean
  streak_alerts: boolean
  weekly_report: boolean
  save_chat_history: boolean
  usage_analytics: boolean
}

function loadNotifPrefs(): NotifPrefs {
  if (typeof window === 'undefined') return {
    daily_reminders: true, streak_alerts: true,
    weekly_report: false, save_chat_history: true, usage_analytics: true,
  }
  try {
    return JSON.parse(localStorage.getItem('jarvis_notif_prefs') || 'null') ?? {
      daily_reminders: true, streak_alerts: true,
      weekly_report: false, save_chat_history: true, usage_analytics: true,
    }
  } catch {
    return { daily_reminders: true, streak_alerts: true, weekly_report: false, save_chat_history: true, usage_analytics: true }
  }
}

export default function SettingsClient() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useAuth()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedField, setSavedField] = useState<string | null>(null)

  // Editable text fields
  const [name, setName] = useState('')
  const [year, setYear] = useState('')
  const [board, setBoard] = useState('')
  const [target, setTarget] = useState('')

  // Accessibility toggles (DB-backed)
  const [adhdMode, setAdhdMode] = useState(false)
  const [dyslexiaMode, setDyslexiaMode] = useState(false)
  const [dyscalculiaMode, setDyscalculiaMode] = useState(false)

  // Notification prefs (localStorage)
  const [notifs, setNotifs] = useState<NotifPrefs>({
    daily_reminders: true, streak_alerts: true, weekly_report: false,
    save_chat_history: true, usage_analytics: true,
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  // Load notification prefs from localStorage
  useEffect(() => {
    setNotifs(loadNotifPrefs())
  }, [])

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    if (!token) return
    setProfileLoading(true)
    try {
      const res = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const p: ProfileData = data.profile
      setProfile(p)
      setName(p.name ?? '')
      setYear(p.year ?? '')
      setBoard(p.board ?? '')
      setTarget(p.target ?? '')
      setAdhdMode(p.adhd_mode)
      setDyslexiaMode(p.dyslexia_mode)
      setDyscalculiaMode(p.dyscalculia_mode)
    } catch {
      // no-op
    } finally {
      setProfileLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) fetchProfile()
  }, [token, fetchProfile])

  const patchProfile = useCallback(async (updates: Partial<ProfileData>, fieldKey: string) => {
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        setSavedField(fieldKey)
        setTimeout(() => setSavedField(null), 2000)
      }
    } catch {
      // no-op
    } finally {
      setSaving(false)
    }
  }, [token])

  const saveNotifPref = useCallback((key: keyof NotifPrefs, value: boolean) => {
    const updated = { ...notifs, [key]: value }
    setNotifs(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis_notif_prefs', JSON.stringify(updated))
    }
  }, [notifs])

  const handleAccessibilityToggle = useCallback(async (
    key: 'adhd_mode' | 'dyslexia_mode' | 'dyscalculia_mode',
    setter: (v: boolean) => void,
    current: boolean,
  ) => {
    const next = !current
    setter(next)
    await patchProfile({ [key]: next }, key)
  }, [patchProfile])

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#0B0F14' }}>
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const EXAM_BOARDS = ['AQA', 'Edexcel', 'OCR', 'WJEC', 'Eduqas', 'MEI']
  const YEAR_GROUPS = ['Year 12', 'Year 13', 'Private candidate', 'Other']
  const TARGET_GRADES = ['A*', 'A', 'B', 'C', 'D', 'E']

  return (
    <div className="flex min-h-screen" style={{ background: '#0B0F14' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col ml-60">
        <Header title="Settings" subtitle="Manage your account and preferences" />

        <main className="flex-1 px-8 py-6 max-w-2xl space-y-4">

          {/* Account */}
          <SettingCard title="Account" icon={User} color="#4F8CFF">
            <SettingRow label="Display name">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={() => patchProfile({ name }, 'name')}
                className="bg-transparent text-sm text-right text-foreground outline-none w-40 text-right"
                placeholder="Your name"
              />
              <SaveIndicator show={savedField === 'name'} saving={saving} />
            </SettingRow>
            <SettingRow label="Email address">
              <span className="text-sm text-muted">{profile?.email ?? user.email}</span>
            </SettingRow>
            <SettingRow label="Year group">
              <select
                value={year}
                onChange={e => { setYear(e.target.value); patchProfile({ year: e.target.value }, 'year') }}
                className="bg-transparent text-sm text-right text-foreground outline-none cursor-pointer"
                style={{ background: 'transparent' }}
              >
                {YEAR_GROUPS.map(y => <option key={y} value={y} style={{ background: '#121821' }}>{y}</option>)}
              </select>
              <SaveIndicator show={savedField === 'year'} saving={saving} />
            </SettingRow>
            <SettingRow label="Exam board">
              <select
                value={board}
                onChange={e => { setBoard(e.target.value); patchProfile({ board: e.target.value }, 'board') }}
                className="bg-transparent text-sm text-right text-foreground outline-none cursor-pointer"
                style={{ background: 'transparent' }}
              >
                {EXAM_BOARDS.map(b => <option key={b} value={b} style={{ background: '#121821' }}>{b}</option>)}
              </select>
              <SaveIndicator show={savedField === 'board'} saving={saving} />
            </SettingRow>
            <SettingRow label="Target grade">
              <select
                value={target}
                onChange={e => { setTarget(e.target.value); patchProfile({ target: e.target.value }, 'target') }}
                className="bg-transparent text-sm text-right text-foreground outline-none cursor-pointer"
                style={{ background: 'transparent' }}
              >
                {TARGET_GRADES.map(g => <option key={g} value={g} style={{ background: '#121821' }}>{g}</option>)}
              </select>
              <SaveIndicator show={savedField === 'target'} saving={saving} />
            </SettingRow>
          </SettingCard>

          {/* Accessibility */}
          <SettingCard title="Accessibility" icon={Palette} color="#22C55E">
            <ToggleRow
              label="ADHD mode"
              sub="Shorter responses, more structured steps"
              value={adhdMode}
              onToggle={() => handleAccessibilityToggle('adhd_mode', setAdhdMode, adhdMode)}
              saved={savedField === 'adhd_mode'}
            />
            <ToggleRow
              label="Dyslexia mode"
              sub="Dyslexia-friendly font and spacing"
              value={dyslexiaMode}
              onToggle={() => handleAccessibilityToggle('dyslexia_mode', setDyslexiaMode, dyslexiaMode)}
              saved={savedField === 'dyslexia_mode'}
            />
            <ToggleRow
              label="Dyscalculia mode"
              sub="Extra support with numbers and symbols"
              value={dyscalculiaMode}
              onToggle={() => handleAccessibilityToggle('dyscalculia_mode', setDyscalculiaMode, dyscalculiaMode)}
              saved={savedField === 'dyscalculia_mode'}
            />
          </SettingCard>

          {/* Notifications */}
          <SettingCard title="Notifications" icon={Bell} color="#f59e0b">
            <ToggleRow
              label="Daily study reminders"
              sub="Remind you to study each day"
              value={notifs.daily_reminders}
              onToggle={() => saveNotifPref('daily_reminders', !notifs.daily_reminders)}
            />
            <ToggleRow
              label="Streak alerts"
              sub="Don't let your streak break"
              value={notifs.streak_alerts}
              onToggle={() => saveNotifPref('streak_alerts', !notifs.streak_alerts)}
            />
            <ToggleRow
              label="Weekly progress report"
              sub="Summary of your week's learning"
              value={notifs.weekly_report}
              onToggle={() => saveNotifPref('weekly_report', !notifs.weekly_report)}
            />
          </SettingCard>

          {/* Privacy */}
          <SettingCard title="Privacy & Security" icon={Shield} color="#8B5CF6">
            <ToggleRow
              label="Save chat history"
              sub="Store conversations for context"
              value={notifs.save_chat_history}
              onToggle={() => saveNotifPref('save_chat_history', !notifs.save_chat_history)}
            />
            <ToggleRow
              label="Usage analytics"
              sub="Help us improve Jarvis"
              value={notifs.usage_analytics}
              onToggle={() => saveNotifPref('usage_analytics', !notifs.usage_analytics)}
            />
          </SettingCard>

          {/* Subscription */}
          <SettingCard title="Subscription" icon={CreditCard} color="#ef4444">
            <SettingRow label="Current plan">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                style={{
                  background: profile?.plan === 'homeschool' ? 'rgba(79,140,255,0.12)' : 'rgba(154,164,175,0.1)',
                  color: profile?.plan === 'homeschool' ? '#4F8CFF' : '#9AA4AF',
                  border: profile?.plan === 'homeschool' ? '1px solid rgba(79,140,255,0.25)' : '1px solid rgba(154,164,175,0.15)',
                }}
              >
                {profile?.plan === 'homeschool' ? 'Student' : 'Free'}
              </span>
            </SettingRow>
            {profile?.plan !== 'homeschool' && (
              <SettingRow label="">
                <a
                  href="/pricing"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Upgrade to Student →
                </a>
              </SettingRow>
            )}
          </SettingCard>

          {/* Danger zone */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
              onClick={() => {
                if (window.confirm('Are you sure you want to permanently delete your account? This cannot be undone.')) {
                  // TODO: wire to delete account API
                  alert('Please contact support to delete your account.')
                }
              }}
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

function SettingCard({
  title, icon: Icon, color, children,
}: {
  title: string
  icon: React.ElementType
  color: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-card overflow-hidden"
      style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="divide-y divide-white/[0.04]">{children}</div>
    </motion.div>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 group hover:bg-white/[0.02] transition-colors">
      <span className="text-sm text-muted group-hover:text-foreground transition-colors">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

function ToggleRow({
  label, sub, value, onToggle, saved,
}: {
  label: string
  sub?: string
  value: boolean
  onToggle: () => void
  saved?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-3.5 group hover:bg-white/[0.02] transition-colors cursor-pointer"
      onClick={onToggle}
    >
      <div>
        <p className="text-sm text-muted group-hover:text-foreground transition-colors">{label}</p>
        {sub && <p className="text-xs text-muted/60 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">
        <AnimatePresence>
          {saved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-accent"
            >
              <Check className="w-3 h-3" />
            </motion.span>
          )}
        </AnimatePresence>
        <div
          className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
          style={{ background: value ? '#4F8CFF' : 'rgba(255,255,255,0.1)' }}
        >
          <motion.div
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
            animate={{ left: value ? '18px' : '2px' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </div>
      </div>
    </div>
  )
}

function SaveIndicator({ show, saving }: { show: boolean; saving: boolean }) {
  return (
    <AnimatePresence>
      {(show || saving) && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-xs"
          style={{ color: saving ? '#9AA4AF' : '#22C55E' }}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </motion.span>
      )}
    </AnimatePresence>
  )
}
