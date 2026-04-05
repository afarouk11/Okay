'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'

/* ─── Types ─────────────────────────────────────────────────────────────── */

type ChatMsg = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

type MemoryItem = {
  type: string
  content: string
  topic?: string
  created_at: string
}

/* ─── Constants ─────────────────────────────────────────────────────────── */

const JARVIS_SYSTEM_PROMPT = `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), an expert A-Level Mathematics assistant for UK students.

Your role:
- Explain mathematical concepts step-by-step with precision and clarity
- Use $ for inline LaTeX notation (e.g. $x^2 + y^2 = r^2$) and $$...$$ for display/block equations
- Cover all A-Level Maths topics: Pure Mathematics (algebra, calculus, trigonometry, vectors, proof, series), Statistics, and Mechanics
- Adapt explanations to the student's current level and identify misconceptions
- Provide fully worked examples and verify student understanding at each step
- Use British English terminology and follow UK A-Level curriculum conventions (Edexcel, AQA, OCR)
- Be encouraging and patient — build confidence alongside knowledge
- Number your steps clearly when solving problems (Step 1:, Step 2:, etc.)
- When a student makes an error, explain exactly where they went wrong and why
- Suggest practice questions when appropriate`

const INITIAL_MESSAGE: ChatMsg = {
  id: 'init',
  role: 'assistant',
  content:
    "Good day. I'm J.A.R.V.I.S. — your A-Level Mathematics assistant. I can help with Pure Maths, Statistics, and Mechanics. What shall we work on today?",
  timestamp: new Date(),
}

const TOPIC_CHIPS = [
  'Differentiation',
  'Integration',
  'Mechanics',
  'Statistics',
  'Proof',
  'Trigonometry',
]

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function formatTimer(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

/**
 * Tokenises a single line into React inline nodes.
 * Handles: $$…$$, $…$, **bold**, `code` — all rendered as React elements (no innerHTML).
 */
function renderInline(line: string, keyPrefix: string): React.ReactNode[] {
  // Split on $$ display math first (though display math is handled at block level)
  const parts = line.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\*\*[^*]+\*\*|`[^`\n]+`)/)
  return parts.map((part, i) => {
    const k = `${keyPrefix}-${i}`
    if (part.startsWith('$$') && part.endsWith('$$')) {
      return (
        <code key={k} className="j-math-block">
          {part.slice(2, -2)}
        </code>
      )
    }
    if (part.startsWith('$') && part.endsWith('$')) {
      return (
        <code key={k} className="j-math-inline">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={k}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={k} className="j-code">{part.slice(1, -1)}</code>
    }
    return part
  })
}

/**
 * Renders message content as React nodes (no dangerouslySetInnerHTML).
 * Handles: $$…$$ display math blocks, inline patterns, paragraphs, line breaks.
 */
function MessageContent({ text }: { text: string }) {
  // Split on display-math blocks first to handle them as block elements
  const segments = text.split(/(\$\$[\s\S]+?\$\$)/)

  const nodes: React.ReactNode[] = []
  segments.forEach((seg, si) => {
    if (seg.startsWith('$$') && seg.endsWith('$$')) {
      nodes.push(
        <pre key={`dm-${si}`} className="j-math-block">
          <code>{seg.slice(2, -2)}</code>
        </pre>,
      )
      return
    }
    // Split remaining text on double-newlines for paragraphs
    const paras = seg.split(/\n\n+/)
    paras.forEach((para, pi) => {
      if (!para) return
      const lines = para.split(/\n/)
      const lineNodes: React.ReactNode[] = []
      lines.forEach((line, li) => {
        lineNodes.push(...renderInline(line, `${si}-${pi}-${li}`))
        if (li < lines.length - 1) lineNodes.push(<br key={`br-${si}-${pi}-${li}`} />)
      })
      nodes.push(
        <p key={`p-${si}-${pi}`} className="j-p">
          {lineNodes}
        </p>,
      )
    })
  })

  return <>{nodes}</>
}

/** Strip markdown/LaTeX from text for TTS. */
function stripForTTS(text: string): string {
  return text
    .replace(/\$\$[\s\S]+?\$\$/g, ', equation, ')
    .replace(/\$[^$\n]+?\$/g, ', equation, ')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .substring(0, 500)
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function JarvisPageClient() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useAuth()

  const [activeTab, setActiveTab] = useState<'text' | 'voice'>('text')
  const [messages, setMessages] = useState<ChatMsg[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [handsFree, setHandsFree] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [copied, setCopied] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sessionStartRef = useRef<number>(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null)

  /* ── Auth guard ───────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  /* ── Session timer ────────────────────────────────────────────────────── */
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSessionSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000))
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  /* ── Fetch session memory ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!token) return
    fetch('/api/memory?limit=1', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setMemories(d.memories ?? []))
      .catch(() => {})
  }, [token])

  /* ── Auto-scroll ──────────────────────────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ── TTS via Web Audio API ────────────────────────────────────────────── */
  const speakText = useCallback(
    async (text: string) => {
      if (!token) return
      // Stop any currently playing audio
      try {
        audioSourceRef.current?.stop()
      } catch {
        // already stopped
      }

      const cleanText = stripForTTS(text)
      if (!cleanText) return

      try {
        setIsSpeaking(true)
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: cleanText, voice: 'jarvis' }),
        })
        if (!res.ok) {
          setIsSpeaking(false)
          return
        }

        const arrayBuf = await res.arrayBuffer()
        const AudioCtx =
          window.AudioContext ||
          (
            window as Window &
              typeof globalThis & {
                webkitAudioContext?: typeof AudioContext
              }
          ).webkitAudioContext
        if (!AudioCtx) {
          setIsSpeaking(false)
          return
        }
        const ctx = new AudioCtx()
        const decoded = await ctx.decodeAudioData(arrayBuf)
        const source = ctx.createBufferSource()
        source.buffer = decoded
        source.connect(ctx.destination)
        source.onended = () => setIsSpeaking(false)
        source.start()
        audioSourceRef.current = source
      } catch {
        setIsSpeaking(false)
      }
    },
    [token],
  )

  /* ── Send message ─────────────────────────────────────────────────────── */
  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const msgText = (overrideText ?? input).trim()
      if (!msgText || chatLoading || !token) return

      const userMsg: ChatMsg = {
        id: Date.now().toString(),
        role: 'user',
        content: msgText,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setChatLoading(true)

      try {
        const history = [...messages, userMsg].slice(-20).map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: history,
            systemPrompt: JARVIS_SYSTEM_PROMPT,
          }),
        })

        if (!res.ok) throw new Error('Chat API error')
        const data = await res.json()
        const content: string = data.response ?? 'I apologise, something went wrong.'

        const assistantMsg: ChatMsg = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMsg])

        if (handsFree || activeTab === 'voice') {
          speakText(content)
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: "I'm having trouble connecting right now. Please try again.",
            timestamp: new Date(),
          },
        ])
      } finally {
        setChatLoading(false)
      }
    },
    [input, chatLoading, messages, token, handsFree, activeTab, speakText],
  )

  /* ── Copy to clipboard ────────────────────────────────────────────────── */
  const copyToClipboard = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  /* ── Clear chat ───────────────────────────────────────────────────────── */
  const clearChat = useCallback(() => {
    setMessages([{ ...INITIAL_MESSAGE, timestamp: new Date() }])
  }, [])

  /* ── Keyboard handler ─────────────────────────────────────────────────── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  /* ── Session memory summary ───────────────────────────────────────────── */
  const sessionMemory = memories.find(
    (m) => m.type === 'session_summary' || m.type === 'topic_summary',
  )
  const lastTopic = sessionMemory?.topic ?? memories[0]?.topic

  /* ── Loading / auth states ────────────────────────────────────────────── */
  if (authLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: '#080B14' }}
      >
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: '#C9A84C', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (!user) return null

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Global CSS for animations and message formatting */}
      <style>{`
        @keyframes j-orb-pulse {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes j-orb-ring {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes j-avatar-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(201,168,76,0); }
        }
        @keyframes j-speak-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 24px rgba(0,212,255,0.35); }
          50% { transform: scale(1.07); box-shadow: 0 0 48px rgba(0,212,255,0.7); }
        }
        @keyframes j-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes j-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%           { transform: translateY(-6px); }
        }
        .j-msg { animation: j-fade-in 0.3s ease forwards; }
        .j-math-block {
          background: rgba(201,168,76,0.06);
          border: 1px solid rgba(201,168,76,0.2);
          border-radius: 8px;
          padding: 12px 16px;
          overflow-x: auto;
          margin: 10px 0;
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.88em;
          color: #C9A84C;
          white-space: pre-wrap;
        }
        .j-math-inline {
          background: rgba(0,212,255,0.07);
          border: 1px solid rgba(0,212,255,0.18);
          border-radius: 4px;
          padding: 1px 5px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.88em;
          color: #00D4FF;
        }
        .j-code {
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
          padding: 1px 5px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.88em;
        }
        .j-p { margin: 0 0 8px 0; line-height: 1.65; }
        .j-p:last-child { margin-bottom: 0; }
        .j-orb-speaking {
          animation: j-speak-pulse 0.9s ease-in-out infinite !important;
        }
      `}</style>

      <div
        className="flex flex-col min-h-screen"
        style={{ background: '#080B14', color: '#E8F0FF' }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header
          style={{
            borderBottom: '1px solid rgba(201,168,76,0.15)',
            background: 'rgba(8,11,20,0.96)',
            backdropFilter: 'blur(12px)',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}
        >
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm select-none"
                style={{
                  background: 'linear-gradient(135deg, #C9A84C 0%, #8B6914 100%)',
                  color: '#080B14',
                  animation: 'j-avatar-glow 2.5s ease-in-out infinite',
                }}
              >
                J
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: '#C9A84C' }}>
                  J.A.R.V.I.S.
                </div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  A-Level Maths Assistant
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div
              className="flex items-center gap-1 rounded-lg p-1"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {(['text', 'voice'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
                  style={{
                    background:
                      activeTab === tab ? 'rgba(201,168,76,0.15)' : 'transparent',
                    color: activeTab === tab ? '#C9A84C' : 'rgba(255,255,255,0.45)',
                    border:
                      activeTab === tab
                        ? '1px solid rgba(201,168,76,0.3)'
                        : '1px solid transparent',
                  }}
                >
                  {tab === 'text' ? '💬 Text' : '🎤 Voice'}
                </button>
              ))}
            </div>

            {/* Timer + back */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <span
                className="text-sm font-mono tabular-nums"
                style={{ color: 'rgba(0,212,255,0.65)' }}
                aria-label="Session duration"
              >
                {formatTimer(sessionSeconds)}
              </span>
              <button
                onClick={() => router.back()}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.45)',
                }}
              >
                ← Back
              </button>
            </div>
          </div>
        </header>

        {/* ── Session Memory Panel ─────────────────────────────────────── */}
        {(lastTopic || memories.length > 0) && (
          <div className="max-w-4xl mx-auto w-full px-6 pt-3">
            <div
              className="rounded-lg px-4 py-2 flex items-center gap-2.5"
              style={{
                background: 'rgba(0,212,255,0.04)',
                border: '1px solid rgba(0,212,255,0.1)',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: '#00D4FF' }}
              />
              <p className="text-xs" style={{ color: 'rgba(0,212,255,0.65)' }}>
                <span style={{ color: 'rgba(255,255,255,0.35)' }}>Last session: </span>
                {lastTopic && (
                  <span style={{ color: '#00D4FF' }}>{lastTopic}</span>
                )}
                {sessionMemory?.content && (
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {' '}
                    · {sessionMemory.content.substring(0, 90)}
                    {sessionMemory.content.length > 90 ? '…' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* ── Main content ─────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-4">
          {activeTab === 'text' ? (
            <TextMode
              messages={messages}
              input={input}
              chatLoading={chatLoading}
              handsFree={handsFree}
              copied={copied}
              messagesEndRef={messagesEndRef}
              textareaRef={textareaRef}
              onInputChange={setInput}
              onSend={sendMessage}
              onKeyDown={handleKeyDown}
              onTopicChip={(t) => sendMessage(t)}
              onHandsFreeToggle={() => setHandsFree((f) => !f)}
              onCopy={copyToClipboard}
              onClear={clearChat}
            />
          ) : (
            <VoiceMode
              isSpeaking={isSpeaking}
              messages={messages}
              input={input}
              chatLoading={chatLoading}
              messagesEndRef={messagesEndRef}
              textareaRef={textareaRef}
              onInputChange={setInput}
              onSend={sendMessage}
              onKeyDown={handleKeyDown}
            />
          )}
        </main>
      </div>
    </>
  )
}

/* ─── TextMode sub-component ─────────────────────────────────────────────── */

type TextModeProps = {
  messages: ChatMsg[]
  input: string
  chatLoading: boolean
  handsFree: boolean
  copied: string | null
  messagesEndRef: React.RefObject<HTMLDivElement>
  textareaRef: React.RefObject<HTMLTextAreaElement>
  onInputChange: (v: string) => void
  onSend: (text?: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onTopicChip: (topic: string) => void
  onHandsFreeToggle: () => void
  onCopy: (id: string, text: string) => void
  onClear: () => void
}

function TextMode({
  messages,
  input,
  chatLoading,
  handsFree,
  copied,
  messagesEndRef,
  textareaRef,
  onInputChange,
  onSend,
  onKeyDown,
  onTopicChip,
  onHandsFreeToggle,
  onCopy,
  onClear,
}: TextModeProps) {
  return (
    <div className="flex flex-col flex-1 gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: '#C9A84C',
              animation: 'j-avatar-glow 2s ease-in-out infinite',
            }}
          />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>
            Jarvis is ready
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Hands-free toggle */}
          <button
            onClick={onHandsFreeToggle}
            title={handsFree ? 'Disable auto-read' : 'Enable auto-read (hands-free)'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: handsFree
                ? 'rgba(0,212,255,0.1)'
                : 'rgba(255,255,255,0.03)',
              border: handsFree
                ? '1px solid rgba(0,212,255,0.3)'
                : '1px solid rgba(255,255,255,0.07)',
              color: handsFree ? '#00D4FF' : 'rgba(255,255,255,0.4)',
            }}
          >
            <span>{handsFree ? '🔊' : '🔇'}</span>
            <span>{handsFree ? 'Hands-free on' : 'Hands-free'}</span>
          </button>
          {/* Clear chat */}
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            ↺ New chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto rounded-xl p-5 space-y-4"
        style={{
          background: 'rgba(13,17,32,0.6)',
          border: '1px solid rgba(201,168,76,0.08)',
          minHeight: '400px',
        }}
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="j-msg flex gap-3"
            style={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
          >
            {/* Avatar for assistant */}
            {msg.role === 'assistant' && (
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs mt-1"
                style={{
                  background: 'linear-gradient(135deg, #C9A84C, #8B6914)',
                  color: '#080B14',
                }}
              >
                J
              </div>
            )}

            <div
              className="rounded-xl px-4 py-3 max-w-[82%]"
              style={
                msg.role === 'user'
                  ? {
                      background: 'rgba(201,168,76,0.12)',
                      border: '1px solid rgba(201,168,76,0.2)',
                    }
                  : {
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }
              }
            >
              {msg.role === 'assistant' ? (
                <>
                  <div
                    className="text-sm msg-content"
                    style={{ color: '#E8F0FF', lineHeight: 1.65 }}
                  >
                    <MessageContent text={msg.content} />
                  </div>
                  {/* Copy button */}
                  <button
                    onClick={() => onCopy(msg.id, msg.content)}
                    className="mt-2 text-xs transition-colors"
                    style={{
                      color: copied === msg.id ? '#00D4FF' : 'rgba(255,255,255,0.25)',
                    }}
                    title="Copy response"
                  >
                    {copied === msg.id ? '✓ Copied' : '⎘ Copy'}
                  </button>
                </>
              ) : (
                <p className="text-sm" style={{ color: '#E8F0FF' }}>
                  {msg.content}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {chatLoading && (
          <div className="j-msg flex gap-3">
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs"
              style={{
                background: 'linear-gradient(135deg, #C9A84C, #8B6914)',
                color: '#080B14',
              }}
            >
              J
            </div>
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-1.5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{
                    background: '#C9A84C',
                    animation: `j-dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Topic chips */}
      <div className="flex flex-wrap gap-2">
        {TOPIC_CHIPS.map((t) => (
          <button
            key={t}
            onClick={() => onTopicChip(t)}
            disabled={chatLoading}
            className="px-3 py-1 rounded-full text-xs transition-all disabled:opacity-40"
            style={{
              background: 'rgba(201,168,76,0.07)',
              border: '1px solid rgba(201,168,76,0.2)',
              color: '#C9A84C',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div
        className="rounded-xl p-3"
        style={{
          background: 'rgba(13,17,32,0.8)',
          border: '1px solid rgba(201,168,76,0.15)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={chatLoading}
          placeholder="Ask about any A-Level Maths topic… (Enter to send, Shift+Enter for new line)"
          rows={3}
          className="w-full bg-transparent text-sm resize-none outline-none disabled:opacity-60"
          style={{ color: '#E8F0FF', caretColor: '#C9A84C' }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {input.length > 0 ? `${input.length} chars` : 'Press Enter to send'}
          </span>
          <button
            onClick={() => onSend()}
            disabled={chatLoading || !input.trim()}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #C9A84C, #8B6914)',
              color: '#080B14',
            }}
          >
            {chatLoading ? 'Thinking…' : 'Send →'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── VoiceMode sub-component ────────────────────────────────────────────── */

type VoiceModeProps = {
  isSpeaking: boolean
  messages: ChatMsg[]
  input: string
  chatLoading: boolean
  messagesEndRef: React.RefObject<HTMLDivElement>
  textareaRef: React.RefObject<HTMLTextAreaElement>
  onInputChange: (v: string) => void
  onSend: (text?: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

function VoiceMode({
  isSpeaking,
  messages,
  input,
  chatLoading,
  messagesEndRef,
  textareaRef,
  onInputChange,
  onSend,
  onKeyDown,
}: VoiceModeProps) {
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')

  return (
    <div className="flex flex-col items-center gap-6 flex-1 py-6">
      {/* Animated orb */}
      <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
        {/* Outer ring pulse (repeating) */}
        <div
          className="absolute rounded-full"
          style={{
            width: 200,
            height: 200,
            background: 'transparent',
            border: `2px solid ${isSpeaking ? 'rgba(0,212,255,0.4)' : 'rgba(201,168,76,0.2)'}`,
            animation: 'j-orb-ring 2s ease-out infinite',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 200,
            height: 200,
            background: 'transparent',
            border: `2px solid ${isSpeaking ? 'rgba(0,212,255,0.3)' : 'rgba(201,168,76,0.15)'}`,
            animation: 'j-orb-ring 2s ease-out 0.6s infinite',
          }}
        />
        {/* Core orb */}
        <div
          className={isSpeaking ? 'j-orb-speaking' : ''}
          style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: isSpeaking
              ? 'radial-gradient(circle at 35% 35%, rgba(0,212,255,0.4), rgba(0,80,120,0.6) 50%, rgba(0,212,255,0.1) 100%)'
              : 'radial-gradient(circle at 35% 35%, rgba(201,168,76,0.35), rgba(100,70,10,0.5) 50%, rgba(201,168,76,0.08) 100%)',
            border: `2px solid ${isSpeaking ? 'rgba(0,212,255,0.5)' : 'rgba(201,168,76,0.4)'}`,
            boxShadow: isSpeaking
              ? '0 0 40px rgba(0,212,255,0.35), inset 0 0 30px rgba(0,212,255,0.1)'
              : '0 0 30px rgba(201,168,76,0.2), inset 0 0 20px rgba(201,168,76,0.07)',
            animation: isSpeaking ? undefined : 'j-orb-pulse 3s ease-in-out infinite',
            transition: 'all 0.4s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            className="font-bold text-4xl select-none"
            style={{
              color: isSpeaking ? '#00D4FF' : '#C9A84C',
              textShadow: isSpeaking
                ? '0 0 20px rgba(0,212,255,0.8)'
                : '0 0 20px rgba(201,168,76,0.6)',
              transition: 'color 0.4s ease',
            }}
          >
            J
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="text-center">
        <p
          className="text-base font-medium"
          style={{ color: isSpeaking ? '#00D4FF' : 'rgba(255,255,255,0.6)' }}
        >
          {chatLoading
            ? 'Processing…'
            : isSpeaking
            ? 'Speaking…'
            : 'Listening for your input'}
        </p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {isSpeaking
            ? 'J.A.R.V.I.S. is reading the response aloud'
            : 'Type below — responses will be read aloud'}
        </p>
      </div>

      {/* Last assistant message (condensed) */}
      {lastAssistant && lastAssistant.id !== 'init' && (
        <div
          className="w-full max-w-lg rounded-xl px-5 py-4"
          style={{
            background: 'rgba(13,17,32,0.7)',
            border: `1px solid ${isSpeaking ? 'rgba(0,212,255,0.2)' : 'rgba(201,168,76,0.12)'}`,
          }}
        >
          <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Last response
          </p>
          <p
            className="text-sm"
            style={{ color: '#E8F0FF', lineHeight: 1.6 }}
            // Show plain text (no HTML) for conciseness
          >
            {lastAssistant.content.replace(/\$\$[\s\S]+?\$\$/g, '[equation]').replace(/\$[^$\n]+?\$/g, '[eq]').substring(0, 200)}
            {lastAssistant.content.length > 200 ? '…' : ''}
          </p>
        </div>
      )}

      {/* Input (voice mode still uses text, TTS handles playback) */}
      <div
        className="w-full max-w-lg rounded-xl p-3"
        style={{
          background: 'rgba(13,17,32,0.8)',
          border: '1px solid rgba(0,212,255,0.15)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={chatLoading || isSpeaking}
          placeholder="Type your question — J.A.R.V.I.S. will respond and read it aloud…"
          rows={2}
          className="w-full bg-transparent text-sm resize-none outline-none disabled:opacity-50"
          style={{ color: '#E8F0FF', caretColor: '#00D4FF' }}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={() => onSend()}
            disabled={chatLoading || isSpeaking || !input.trim()}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,255,0.7), rgba(0,130,180,0.7))',
              color: '#080B14',
            }}
          >
            {chatLoading ? 'Thinking…' : 'Send →'}
          </button>
        </div>
      </div>

      <div ref={messagesEndRef} />
    </div>
  )
}
