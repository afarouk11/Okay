'use client'

import { motion } from 'framer-motion'

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-2.5"
    >
      {/* Jarvis avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(135deg, #4F8CFF, #22C55E)' }}
      >
        J
      </div>

      {/* Dots */}
      <div
        className="flex items-center gap-1 px-4 py-3 rounded-[14px] rounded-tl-sm"
        style={{
          background: 'rgba(18,24,33,0.9)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </motion.div>
  )
}
