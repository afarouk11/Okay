'use client'

import { motion } from 'framer-motion'
import { Bell, Search } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  userName?: string
}

export default function Header({ title, subtitle, userName = 'Student' }: HeaderProps) {
  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center justify-between px-8 py-5 border-b border-white/5"
      style={{
        background: 'linear-gradient(180deg, rgba(18,24,33,0.9) 0%, rgba(11,15,20,0) 100%)',
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
        {/* Search */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-white/[0.06] transition-colors"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </motion.button>

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-white/[0.06] transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
        </motion.button>

        {/* Avatar */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #4F8CFF, #6C3EF4)' }}
          title={userName}
        >
          {userName.charAt(0).toUpperCase()}
        </motion.div>
      </div>
    </motion.header>
  )
}
