'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, MessageSquare, CalendarDays, BookOpen,
  StickyNote, Sparkles, Settings, Zap, LogOut,
  Clock3, Network,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/lib/useAuth'
import { createBrowserClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Learn',
    items: [
      { href: '/lessons',  label: 'Lessons',  icon: BookOpen },
      { href: '/exam-sim', label: 'Exam Sim', icon: Clock3   },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { href: '/jarvis', label: 'J.A.R.V.I.S.', icon: Sparkles      },
      { href: '/chat',   label: 'Chat',          icon: MessageSquare },
    ],
  },
  {
    label: 'Organise',
    items: [
      { href: '/plan',    label: 'Daily Plan', icon: CalendarDays },
      { href: '/notes',   label: 'Notes',      icon: StickyNote   },
      { href: '/mindmap', label: 'Mind Map',   icon: Network      },
    ],
  },
]

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link href={href} prefetch={false}>
      <div className={clsx(
        'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer select-none',
        active
          ? 'text-[#C9A84C]'
          : 'text-[#5A7499] hover:text-[#C8D8F0] hover:bg-white/[0.04]',
      )}
        style={active ? { background: 'rgba(201,168,76,0.1)', boxShadow: 'inset 0 0 0 1px rgba(201,168,76,0.15)' } : {}}
      >
        <Icon className={clsx('w-4 h-4 flex-shrink-0', active ? 'text-[#C9A84C]' : 'text-[#3D5470]')} />
        <span className="flex-1 truncate">{label}</span>
        {active && <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] flex-shrink-0" />}
      </div>
    </Link>
  )
}

export default function Sidebar() {
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
  const xp          = profile?.xp ?? 0
  const level       = profile?.level ?? 1
  const xpProgress  = Math.min((xp % 500) / 500, 1)

  async function handleLogout() {
    const supabase = createBrowserClient()
    if (supabase) await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-30"
      style={{
        width: 225,
        background: 'rgba(5,7,15,0.97)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[58px] flex-shrink-0"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ background: 'linear-gradient(135deg, #C9A84C, #D4B86A)' }}>
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="font-bold text-[14px] text-white tracking-tight leading-none">Synapnode</p>
          <p className="text-[10px] mt-0.5" style={{ color: '#3D5470' }}>A-Level Maths AI</p>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-2" style={{ scrollbarWidth: 'none' }}>
        {NAV_GROUPS.map(group => (
          <div
            key={group.label}
            className="rounded-2xl p-2 space-y-0.5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] px-2 pb-1.5 pt-0.5"
               style={{ color: 'rgba(90,116,153,0.5)' }}>
              {group.label}
            </p>
            {group.items.map(item => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom: XP + user */}
      <div className="flex-shrink-0 px-3 pb-3 space-y-2"
           style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12 }}>

        {/* XP bar card */}
        <div className="rounded-2xl px-3 py-2.5"
             style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.1)' }}>
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] font-semibold" style={{ color: '#C9A84C' }}>Level {level}</span>
            <span className="text-[10px]" style={{ color: '#5A7499' }}>{xp % 500} / 500 XP</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress * 100}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #C9A84C, #D4B86A)' }}
            />
          </div>
        </div>

        {/* User card */}
        <div className="rounded-2xl px-3 py-2.5 flex items-center gap-2.5"
             style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #C9A84C, #00D4FF)' }}>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white truncate leading-tight">{displayName}</p>
            <p className="text-[10px] truncate" style={{ color: '#5A7499' }}>Student</p>
          </div>
          <div className="flex gap-0.5 flex-shrink-0">
            <Link href="/settings">
              <button className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
                style={{ color: '#5A7499' }}>
                <Settings className="w-3.5 h-3.5" />
              </button>
            </Link>
            <button onClick={handleLogout}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
              style={{ color: '#5A7499' }}>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
