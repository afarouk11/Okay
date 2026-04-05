'use client'

import { useRef, useCallback, KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { Send, Mic } from 'lucide-react'

interface InputBoxProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onVoice?: () => void
  disabled?: boolean
  placeholder?: string
  isRecording?: boolean
}

export default function InputBox({
  value,
  onChange,
  onSend,
  onVoice,
  disabled = false,
  placeholder = 'Ask Jarvis anything...',
  isRecording = false,
}: InputBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled) onSend()
    }
  }

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [])

  return (
    <div
      className="flex items-end gap-2 p-3 rounded-[14px]"
      style={{
        background: 'rgba(18,24,33,0.8)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); autoResize() }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={4000}
        rows={1}
        className="flex-1 bg-transparent text-sm text-foreground placeholder-muted resize-none outline-none leading-relaxed"
        style={{ minHeight: '22px', maxHeight: '120px' }}
        aria-label="Message input"
      />

      {/* Voice button */}
      {onVoice && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.93 }}
          onClick={onVoice}
          disabled={disabled}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
          style={{
            background: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
            border: isRecording ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.08)',
            color: isRecording ? '#ef4444' : '#9AA4AF',
          }}
          aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
        >
          <Mic className="w-3.5 h-3.5" />
        </motion.button>
      )}

      {/* Send button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.93 }}
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: value.trim() && !disabled ? '#4F8CFF' : 'rgba(79,140,255,0.15)',
          color: value.trim() && !disabled ? '#fff' : 'rgba(79,140,255,0.5)',
        }}
        aria-label="Send message"
      >
        <Send className="w-3.5 h-3.5" />
      </motion.button>
    </div>
  )
}
