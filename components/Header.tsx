'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Search, X, BookOpen, MessageSquare, FileText, CalendarDays } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  title: string
  subtitle?: string
  userName?: string
  action?: React.ReactNode
}

const SEARCH_SHORTCUTS = [
  { icon: MessageSquare, label: 'Chat with Jarvis', href: '/chat', color: '#00D4FF' },
  { icon: BookOpen,      label: 'Browse Lessons',   href: '/lessons', color: '#B060FF' },
  { icon: FileText,      label: 'Past Papers',       href: '/papers',  color: '#FF8C00' },
  { icon: CalendarDays,  label: "Today's Plan",      href: '/plan',    color: '#00FF9D' },
]

const NOTIFICATIONS = [
  { id: 1, text: "You're on a 3-day study streak! Keep it up 🔥", time: 'Just now', unread: true },
  { id: 2, text: 'New past paper questions available for AQA Pure 2', time: '2h ago', unread: true },
  { id: 3, text: 'Weekly progress report is ready to view', time: '1d ago', unread: false },
]

export default function Header({ title, subtitle, userName = 'Student', action }: HeaderProps) {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<number>>(new Set())
  const searchInputRef = useRef<HTMLInputElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const unreadCount = NOTIFICATIONS.filter(n => n.unread && !readIds.has(n.id)).length

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    } else {
      setSearchQuery('')
    }
  }, [searchOpen])

  // Close notification panel on outside click
  useEffect(() => {
    if (!notifOpen) return
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  // Close search on Escape
  useEffect(() => {
    if (!searchOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSearchOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [searchOpen])

  function handleSearchNavigate(href: string) {
    setSearchOpen(false)
    router.push(href)
  }

  function handleOpenNotifs() {
    setNotifOpen(v => !v)
    // Mark all as read when opened
    setReadIds(new Set(NOTIFICATIONS.map(n => n.id)))
  }

  const filteredShortcuts = searchQuery.trim()
    ? SEARCH_SHORTCUTS.filter(s => s.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : SEARCH_SHORTCUTS

  return (
    <>
      <motion.header
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between px-8 py-5 border-b border-white/5"
        style={{
          background: 'linear-gradient(180deg, rgba(13,18,32,0.94) 0%, rgba(3,5,13,0) 100%)',
        }}
      >
        {/* Left: title */}
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-3">
          {action && action}

          {/* Search */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-white/[0.06] transition-colors"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </motion.button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenNotifs}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-white/[0.06] transition-colors relative"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
              <Bell className="w-4 h-4" />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </AnimatePresence>
            </motion.button>

            {/* Notification dropdown */}
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 w-80 rounded-xl overflow-hidden z-50"
                  style={{ background: 'rgba(13,18,32,0.98)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}
                >
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm font-semibold text-foreground">Notifications</p>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {NOTIFICATIONS.map(n => (
                      <div key={n.id} className="px-4 py-3 flex items-start gap-3 hover:bg-white/[0.03] transition-colors">
                        {(n.unread && !readIds.has(n.id)) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                        <div className={n.unread && !readIds.has(n.id) ? '' : 'ml-[18px]'}>
                          <p className="text-xs text-foreground leading-relaxed">{n.text}</p>
                          <p className="text-xs text-muted mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Avatar */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #D4A820, #00D4FF)' }}
            title={userName}
          >
            {userName.charAt(0).toUpperCase()}
          </motion.div>
        </div>
      </motion.header>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchOpen(false)}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(3,5,13,0.7)', backdropFilter: 'blur(4px)' }}
            />

            {/* Search panel */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 rounded-2xl overflow-hidden"
              style={{ background: 'rgba(13,18,32,0.98)', border: '1px solid rgba(0,212,255,0.15)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
                <Search className="w-4 h-4 text-muted flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search pages, topics, features…"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSearchOpen(false)}
                  className="text-muted hover:text-foreground transition-colors"
                  aria-label="Close search"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Quick links */}
              <div className="p-2">
                <p className="text-xs text-muted px-2 py-1.5 uppercase tracking-widest">
                  {searchQuery ? 'Results' : 'Quick links'}
                </p>
                {filteredShortcuts.length > 0 ? (
                  filteredShortcuts.map(({ icon: Icon, label, href, color }) => (
                    <motion.button
                      key={href}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSearchNavigate(href)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left"
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <span className="text-sm text-foreground">{label}</span>
                    </motion.button>
                  ))
                ) : (
                  <p className="text-sm text-muted px-3 py-4 text-center">No results for &quot;{searchQuery}&quot;</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
