'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  MessageSquare,
  CalendarDays,
  BookOpen,
  HelpCircle,
  FileText,
  StickyNote,
  Sparkles,
  Settings,
  Zap,
  LogOut,
  Layers3,
  Brain,
  GraduationCap,
  Calculator,
  Sigma,
  LibraryBig,
  FileCheck2,
  Clock3,
  Network,
  HeartPulse,
  Trophy,
  AlertTriangle,
  CheckSquare,
  Target,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/lib/useAuth'
import { createBrowserClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/jarvis',       label: 'J.A.R.V.I.S.',   icon: Sparkles        },
  { href: '/chat',         label: 'Chat',           icon: MessageSquare   },
  { href: '/study',        label: 'Study Hub',      icon: Layers3         },
  { href: '/kids',         label: 'Kids',           icon: BookOpen        },
  { href: '/predict',      label: 'Exam Insights',  icon: Brain           },
  { href: '/formulas',     label: 'Reference',      icon: Sigma           },
  { href: '/resources',    label: 'Resources',      icon: LibraryBig      },
  { href: '/work-checker', label: 'Work Checker',   icon: FileCheck2      },
  { href: '/exam-sim',     label: 'Exam Sim',       icon: Clock3          },
  { href: '/mindmap',      label: 'Mind Map',       icon: Network         },
  { href: '/wellbeing',    label: 'Wellbeing',      icon: HeartPulse      },
  { href: '/plan',         label: 'Daily Plan',     icon: CalendarDays    },
  { href: '/lessons',      label: 'Lessons',        icon: BookOpen        },
  { href: '/questions',    label: 'Questions',      icon: HelpCircle      },
  { href: '/papers',       label: 'Past Papers',    icon: FileText        },
  { href: '/notes',        label: 'Notes',          icon: StickyNote      },
  { href: '/leaderboard', label: 'Leaderboard',    icon: Trophy          },
  { href: '/blitz',       label: 'Quick Blitz',    icon: Zap             },
  { href: '/mistakes',    label: 'Mistakes',       icon: AlertTriangle   },
  { href: '/exams',       label: 'Exam Countdown', icon: CalendarDays    },
  { href: '/checklist',   label: 'Checklist',      icon: CheckSquare     },
  { href: '/goals',       label: 'Daily Goals',    icon: Target          },
]

const kidsItems = [
  { href: '/kids/gcse',       label: 'GCSE Maths',       icon: GraduationCap },
  { href: '/kids/arithmetic', label: 'Arithmetic & SATs', icon: Calculator    },
  { href: '/kids/neuro',      label: 'Neuroplasticity',   icon: Brain         },
]

const bottomItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, token } = useAuth()
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profilePlan, setProfilePlan] = useState<string | null>(null)

  // Fetch profile name and plan
  useEffect(() => {
    if (!token) return
    fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.profile) {
          setProfileName(data.profile.name)
          setProfilePlan(data.profile.plan)
        }
      })
      .catch(() => {})
  }, [token])

  const displayName = profileName ?? user?.email?.split('@')[0] ?? 'Student'
  const planLabel = profilePlan === 'homeschool' ? 'Student Plan' : 'Free Plan'

  async function handleLogout() {
    const supabase = createBrowserClient()
    if (supabase) await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-0 top-0 h-full w-60 flex flex-col z-30"
      style={{
        background: 'rgba(8,12,24,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(0,212,255,0.12)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg, #00D4FF, #00FF9D)' }}
        >
          S
        </div>
        <div>
          <span className="font-semibold text-[15px] text-foreground tracking-tight">Synaptiq</span>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-slow" />
            <span className="text-[10px] text-muted uppercase tracking-widest">Online</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150 cursor-pointer',
                  active
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted hover:text-foreground hover:bg-white/5',
                )}
              >
                <Icon className="w-[17px] h-[17px] flex-shrink-0" />
                {item.label}
                {active && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Kids & Family divider */}
        <div className="mt-3 mb-1 px-3">
          <div className="border-t border-white/[0.06]" />
        </div>
        <p className="px-4 py-1 text-[9px] font-bold tracking-[0.12em] uppercase"
           style={{ color: 'rgba(0,212,255,0.6)' }}>Kids</p>
        {kidsItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150 cursor-pointer',
                  active
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted hover:text-foreground hover:bg-white/5',
                )}
              >
                <Icon className="w-[17px] h-[17px] flex-shrink-0" />
                {item.label}
                {active && (
                  <motion.div
                    layoutId="sidebar-kids-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </motion.div>
            </Link>
          )
        })}
        <div className="mt-2 mb-1 px-3">
          <div className="border-t border-white/[0.06]" />
        </div>

      {/* Bottom */}
      <div className="px-3 pb-4 pt-2 border-t border-white/5 space-y-0.5">
        {bottomItems.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium text-muted hover:text-foreground hover:bg-white/5 transition-all duration-150 cursor-pointer"
              >
                <Icon className="w-[17px] h-[17px] flex-shrink-0" />
                {item.label}
              </motion.div>
            </Link>
          )
        })}

        {/* User badge */}
        <div className="mt-3 px-3 py-2.5 rounded-[10px] bg-white/[0.03] border border-white/5 flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #D4A820, #00D4FF)' }}
          >
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
            <p className="text-[10px] text-muted truncate">{planLabel}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-muted hover:text-foreground transition-colors flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.aside>
  )
}
