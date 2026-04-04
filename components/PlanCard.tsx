'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

export type PlanTask = {
  id: string
  topic: string
  task: string
  done: boolean
  priority: 'high' | 'medium' | 'low'
}

interface PlanCardProps {
  task: PlanTask
  index: number
  onToggle: (id: string, done: boolean) => void
}

const priorityConfig = {
  high:   { label: 'High',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)'  },
  medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  low:    { label: 'Low',    color: '#22C55E', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)'  },
}

export default function PlanCard({ task, index, onToggle }: PlanCardProps) {
  const [bouncing, setBouncing] = useState(false)
  const p = priorityConfig[task.priority]

  const handleToggle = useCallback(() => {
    setBouncing(true)
    onToggle(task.id, !task.done)
    setTimeout(() => setBouncing(false), 300)
  }, [task.id, task.done, onToggle])

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
      onClick={handleToggle}
      className="group flex items-start gap-4 p-4 rounded-card cursor-pointer transition-all"
      style={{
        background: task.done ? 'rgba(34,197,94,0.04)' : 'rgba(18,24,33,0.8)',
        border: task.done ? '1px solid rgba(34,197,94,0.15)' : '1px solid rgba(255,255,255,0.06)',
        opacity: task.done ? 0.72 : 1,
      }}
      role="checkbox"
      aria-checked={task.done}
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          handleToggle()
        }
      }}
    >
      {/* Checkbox icon */}
      <motion.div
        animate={{ scale: bouncing ? 0.82 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="flex-shrink-0 mt-0.5"
      >
        <AnimatePresence mode="wait">
          {task.done ? (
            <motion.div
              key="checked"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <CheckCircle2 className="w-5 h-5 text-accent" />
            </motion.div>
          ) : (
            <motion.div
              key="unchecked"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Circle className="w-5 h-5 text-muted/40 group-hover:text-muted transition-colors" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(79,140,255,0.1)',
              color: '#4F8CFF',
              border: '1px solid rgba(79,140,255,0.2)',
            }}
          >
            {task.topic}
          </span>
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}
          >
            {p.label}
          </span>
        </div>
        <p
          className={clsx(
            'text-sm text-foreground leading-snug',
            task.done && 'line-through text-muted',
          )}
        >
          {task.task}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight
        className="w-4 h-4 text-muted/30 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-hidden="true"
      />
    </motion.div>
  )
}
