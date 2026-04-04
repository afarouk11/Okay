'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, Mic } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import MessageBubble from '@/components/MessageBubble'
import InputBox from '@/components/InputBox'
import TypingIndicator from '@/components/TypingIndicator'
import { stripNavCommand, extractNavCommand } from '@/lib/jarvis'
import { useRouter } from 'next/navigation'

type ChatMsg = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const INITIAL_MESSAGE: ChatMsg = {
  id: 'init',
  role: 'assistant',
  content:
    "Good to see you. I'm Jarvis — your personal tutor. What are we working on today?",
  timestamp: new Date(),
}

export default function ChatPageClient() {
  const router = useRouter()
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
    scrollToBottom()
  }, [messages, scrollToBottom])

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
      // Send last 20 messages as context
      const history = [...messages, userMsg].slice(-20).map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok) throw new Error('Chat API error')
      const data = await res.json()
      const rawContent: string = data.response ?? 'Sorry, something went wrong.'

      // Phase 7 — Navigation control
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
        setTimeout(() => router.push(navCmd.page), 1200)
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

  // Phase 8 — Voice input (Deepgram)
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

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data)
      }

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
        } catch {
          // voice transcription failed silently
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      // microphone access denied — silent fail
    }
  }, [isRecording])

  const clearChat = useCallback(() => {
    setMessages([{ ...INITIAL_MESSAGE, timestamp: new Date() }])
  }, [])

  return (
    <div className="flex min-h-screen" style={{ background: '#0B0F14' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col ml-60 min-h-screen">
        <Header title="Chat with Jarvis" subtitle="Your personal AI tutor" />

        <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-6 pb-6 pt-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
              <span className="text-xs text-muted">Jarvis is ready</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={clearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted hover:text-foreground transition-colors"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <RefreshCw className="w-3 h-3" />
              New chat
            </motion.button>
          </div>

          {/* Messages area */}
          <div
            className="flex-1 overflow-y-auto space-y-4 rounded-card p-5 mb-4"
            style={{
              background: 'rgba(18,24,33,0.5)',
              border: '1px solid rgba(255,255,255,0.05)',
              minHeight: '420px',
            }}
            aria-live="polite"
            aria-label="Chat messages"
          >
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                />
              ))}
              {loading && <TypingIndicator key="typing" />}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Recording indicator */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                <Mic className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span className="text-xs text-red-400">Recording — tap mic to stop</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          <InputBox
            value={input}
            onChange={setInput}
            onSend={sendMessage}
            onVoice={handleVoice}
            disabled={loading}
            isRecording={isRecording}
            placeholder="Ask me anything about your studies…"
          />
        </div>
      </div>
    </div>
  )
}
