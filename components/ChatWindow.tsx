'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, MessageSquare } from 'lucide-react'
import MessageBubble from './MessageBubble'
import InputBox from './InputBox'
import TypingIndicator from './TypingIndicator'
import { stripNavCommand, extractNavCommand } from '@/lib/jarvis'
import { useRouter } from 'next/navigation'

export type ChatMsg = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

const INITIAL_MESSAGE: ChatMsg = {
  id: 'init',
  role: 'assistant',
  content: "Good to see you. What are we working on today?",
}

export default function ChatWindow() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (open) scrollToBottom()
  }, [messages, open, scrollToBottom])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = [...messages, userMsg].slice(-20).map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok) throw new Error('Failed to send message')

      const data = await res.json()
      const rawContent: string = data.response || 'Sorry, something went wrong.'

      const navCmd = extractNavCommand(rawContent)
      const displayContent = stripNavCommand(rawContent)

      const assistantMsg: ChatMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: displayContent,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMsg])

      if (navCmd?.page) {
        setTimeout(() => {
          router.push(navCmd.page)
          setOpen(false)
        }, 1200)
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, router])

  const handleVoice = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunks, { type: mimeType })
        try {
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': mimeType },
            body: blob,
          })
          const { transcript } = await res.json()
          if (transcript) setInput(transcript)
        } catch { /* ignore transcription errors */ }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch { /* mic access denied */ }
  }, [isRecording])

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{
          background: open
            ? 'rgba(0,212,255,0.14)'
            : 'linear-gradient(135deg, #00D4FF, #00FF9D)',
          border: open ? '1px solid rgba(0,212,255,0.28)' : 'none',
          boxShadow: '0 8px 32px rgba(0,212,255,0.28)',
        }}
        aria-label={open ? 'Close Jarvis' : 'Open Jarvis'}
        aria-expanded={open}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6 text-primary" />
            </motion.div>
          ) : (
            <motion.div
              key="msg"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageSquare className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-6 z-50 w-[380px] flex flex-col rounded-2xl overflow-hidden"
            style={{
              height: '520px',
              background: 'rgba(8,12,24,0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(0,212,255,0.12)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,255,0.08)',
            }}
            role="dialog"
            aria-label="Jarvis AI assistant"
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 border-b border-white/6 flex-shrink-0"
              style={{ background: 'rgba(13,18,32,0.68)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #00D4FF, #00FF9D)' }}
              >
                J
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Jarvis</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <p className="text-[10px] text-muted">Always online</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-white/8 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
              aria-live="polite"
              aria-label="Conversation"
            >
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                />
              ))}
              {loading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 flex-shrink-0 border-t border-white/5">
              <InputBox
                value={input}
                onChange={setInput}
                onSend={sendMessage}
                onVoice={handleVoice}
                disabled={loading}
                isRecording={isRecording}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
