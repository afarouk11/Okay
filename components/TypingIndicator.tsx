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
        style={{ background: 'linear-gradient(135deg, #00D4FF, #00FF9D)' }}
      >
        J
      </div>

      {/* Dots */}
      <div
        className="flex items-center gap-1 px-4 py-3 rounded-[14px] rounded-tl-sm"
        style={{
          background: 'rgba(13,18,32,0.9)',
          border: '1px solid rgba(201,168,76,0.12)',
        }}
      >
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </motion.div>
  )
}
