'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

export default function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={clsx('flex items-start gap-2.5', isUser && 'flex-row-reverse')}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5',
        )}
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #4F8CFF, #6C3EF4)'
            : 'linear-gradient(135deg, #4F8CFF, #22C55E)',
        }}
      >
        {isUser ? 'S' : 'J'}
      </div>

      {/* Bubble */}
      <div className={clsx('flex flex-col gap-1 max-w-[78%]', isUser && 'items-end')}>
        <div
          className={clsx(
            'px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'rounded-[14px] rounded-tr-sm text-white'
              : 'rounded-[14px] rounded-tl-sm text-foreground',
          )}
          style={
            isUser
              ? { background: '#4F8CFF' }
              : {
                  background: 'rgba(18,24,33,0.9)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }
          }
        >
          {/* Render line breaks */}
          {content.split('\n').map((line, i) => (
            <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
              {line}
            </p>
          ))}
        </div>

        {timestamp && (
          <span className="text-[10px] text-muted/60 px-1">
            {timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </motion.div>
  )
}
