'use client'

import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface StatsCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  subtext?: string
  trend?: { value: number; positive: boolean }
  color?: 'blue' | 'green' | 'purple' | 'orange'
  delay?: number
}

const colorMap = {
  blue:   { bg: 'rgba(0,212,255,0.10)',  border: 'rgba(0,212,255,0.24)',  text: '#00D4FF'  },
  green:  { bg: 'rgba(0,255,157,0.10)',  border: 'rgba(0,255,157,0.24)',  text: '#00FF9D'  },
  purple: { bg: 'rgba(176,96,255,0.10)', border: 'rgba(176,96,255,0.24)', text: '#B060FF'  },
  orange: { bg: 'rgba(255,140,0,0.10)',  border: 'rgba(255,140,0,0.24)',  text: '#FF8C00'  },
}

export default function StatsCard({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
  color = 'blue',
  delay = 0,
}: StatsCardProps) {
  const c = colorMap[color]

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="rounded-card p-5 flex flex-col gap-3 cursor-default"
      style={{
        background: 'rgba(13,18,32,0.82)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0,212,255,0.12)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: c.bg, border: `1px solid ${c.border}` }}
      >
        <Icon className="w-[18px] h-[18px]" style={{ color: c.text }} />
      </div>

      {/* Value */}
      <div>
        <p className="text-2xl font-semibold text-foreground tracking-tight">{value}</p>
        <p className="text-sm text-muted mt-0.5">{label}</p>
      </div>

      {/* Trend / subtext */}
      {(trend || subtext) && (
        <div className="flex items-center gap-1.5 text-xs">
          {trend && (
            <span className={clsx('font-medium', trend.positive ? 'text-accent' : 'text-red-400')}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
          )}
          {subtext && <span className="text-muted">{subtext}</span>}
        </div>
      )}
    </motion.div>
  )
}
