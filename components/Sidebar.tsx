'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, MessageSquare, CalendarDays, BookOpen, HelpCircle,
  FileText, StickyNote, Sparkles, Settings, Zap, LogOut, Brain,
  Sigma, LibraryBig, FileCheck2, Clock3, Network, HeartPulse,
  Trophy, AlertTriangle, CheckSquare, Target, ChevronDown, Layers3,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/lib/useAuth'
import { createBrowserClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const sections = [
  {
    label: 'Learn',
    items: [
      { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
      { href: '/lessons',    label: 'Lessons',     icon: BookOpen        },
      { href: '/questions',  label: 'Questions',   icon: HelpCircle      },
      { href: '/papers',     label: 'Past Papers', icon: FileText        },
      { href: '/study',      label: 'Study Hub',   icon: Layers3         },
      { href: '/blitz',      label: 'Quick Blitz', icon: Zap             },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { href: '/jarvis',       label: 'J.A.R.V.I.S.',  icon: Sparkles      },
      { href: '/chat',         label: 'Chat',           icon: MessageSquare },
      { href: '/work-checker', label: 'Work Checker',   icon: FileCheck2    },
      { href: '/exam-sim',     label: 'Exam Sim',       icon: Clock3        },
      { href: '/predict',      label: 'Grade Predict',  icon: Brain         },
    ],
  },
  {
    label: 'Track',
    items: [
      { href: '/plan',        label: 'Daily Plan',  icon: CalendarDays  },
      { href: '/goals',       label: 'Goals',       icon: Target        },
      { href: '/checklist',   label: 'Checklist',   icon: CheckSquare   },
      { href: '/leaderboard', label: 'Leaderboard', icon: Trophy        },
      { href: '/mistakes',    label: 'Mistakes',    icon: AlertTriangle },
    ],
  },
  {
    label: 'Resources',
    items: [
      { href: '/notes',     label: 'Notes',     icon: StickyNote },
      { href: '/formulas',  label: 'Formulas',  icon: Sigma      },
      { href: '/mindmap',   label: 'Mind Map',  icon: Network    },
      { href: '/resources', label: 'Library',   icon: LibraryBig },
      { href: '/wellbeing', label: 'Wellbeing', icon: HeartPulse },
    ],
  },
]

function NavItem({ href, label, icon: Icon, active }: {
  href: string; label: string; icon: React.ElementType; active: boolean
}) {
  return (
    <Link href={href} prefetch={false}>
      <div className={clsx(
        'group flex items-center gap-3 px-3 py-[9px] rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer select-none',
        active
          ? 'bg-[#C9A84C]/10 text-[#C9A84C]'
          : 'text-[#5A7499] hover:text-[#E8F0FF] hover:bg-white/[0.05]',
      )}>
        <Icon className={clsx('w-[15px] h-[15px] flex-shrink-0', active ? 'text-[#C9A84C]' : 'text-[#3D5470] group-hover:text-[#E8F0FF]')} />
        <span className="truncate flex-1">{label}</span>
        {active && <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] flex-shrink-0" />}
      </div>
    </Link>
  )
}

function NavSection({ label, items, pathname, defaultOpen = true }: {
  label: string; items: typeof sections[0]['items']; pathname: string; defaultOpen?: boolean
}) {
  const hasActive = items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'))
  const [open, setOpen] = useState(defaultOpen || hasActive)

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors"
        style={{ color: 'rgba(90,116,153,0.7)' }}
      >
        {label}
        <ChevronDown className={clsx('w-3 h-3 transition-transform duration-200', open ? 'rotate-0' : '-rotate-90')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-0.5 space-y-0.5">
              {items.map(item => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={pathname === item.href || pathname.startsWith(item.href + '/')}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function XpBar({ xp, level }: { xp: number; level: number }) {
  const xpPerLevel = 500
  const progress = Math.min((xp % xpPerLevel) / xpPerLevel, 1)
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-[11px] font-medium" style={{ color: '#5A7499' }}>Lv {level}</span>
        <span className="text-[11px]" style={{ color: '#5A7499' }}>{xp % xpPerLevel} / {xpPerLevel} XP</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #C9A84C, #D4B86A)' }}
        />
      </div>
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, token } = useAuth()
  const [profile, setProfile] = useState<{ name?: string; plan?: string; xp?: number; level?: number } | null>(null)

  useEffect(() => {
    if (!token) return
    fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.profile) setProfile(d.profile) })
      .catch(() => {})
  }, [token])

  const displayName = profile?.name ?? user?.email?.split('@')[0] ?? 'Student'
  const planLabel   = profile?.plan === 'homeschool' ? 'Homeschool' : 'Student'
  const xp          = profile?.xp    ?? 0
  const level       = profile?.level ?? 1

  async function handleLogout() {
    const supabase = createBrowserClient()
    if (supabase) await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <aside
      className="fixed left-0 top-0 h-full w-[225px] flex flex-col z-30"
      style={{ background: '#070A14', borderRight: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[60px] flex-shrink-0"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ background: 'linear-gradient(135deg, #C9A84C, #D4B86A)' }}>
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-[15px] text-white tracking-tight leading-none">Synapnode</p>
          <p className="text-[10px] mt-0.5" style={{ color: '#5A7499' }}>A-Level Maths AI</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4"
           style={{ scrollbarWidth: 'none' }}>
        {sections.map((section, i) => (
          <NavSection
            key={section.label}
            label={section.label}
            items={section.items}
            pathname={pathname}
            defaultOpen={i < 2}
          />
        ))}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
          <NavItem href="/kids" label="Kids Zone" icon={BookOpen}
            active={pathname.startsWith('/kids')} />
        </div>
      </nav>

      {/* Bottom */}
      <div className="flex-shrink-0 px-3 pt-3 pb-4"
           style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <XpBar xp={xp} level={level} />
        <div className="flex items-center gap-2.5 mt-3 px-2 py-2.5 rounded-xl"
             style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #C9A84C, #00D4FF)' }}>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white truncate leading-tight">{displayName}</p>
            <p className="text-[10px] truncate" style={{ color: '#5A7499' }}>{planLabel}</p>
          </div>
          <div className="flex gap-0.5 flex-shrink-0">
            <Link href="/settings">
              <button className="p-1.5 rounded-lg transition-colors"
                style={{ color: '#5A7499' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#E8F0FF')}
                onMouseLeave={e => (e.currentTarget.style.color = '#5A7499')}>
                <Settings className="w-3.5 h-3.5" />
              </button>
            </Link>
            <button onClick={handleLogout}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: '#5A7499' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#E8F0FF')}
              onMouseLeave={e => (e.currentTarget.style.color = '#5A7499')}>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
