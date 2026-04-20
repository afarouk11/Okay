'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

function renderContent(content: string) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Numbered step: "1." "Step 1:" "**Step 1**"
    const stepMatch = line.match(/^(\*\*)?(?:Step\s+)?(\d+)[.:]\*?\*?\s+(.+)/)
    if (stepMatch) {
      const num = stepMatch[2]
      const text = stepMatch[3]
      elements.push(
        <div
          key={i}
          className="flex items-start gap-3 py-2 px-3 rounded-xl my-1"
          style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)' }}
        >
          <span
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{ background: 'rgba(201,168,76,0.18)', color: '#C9A84C' }}
          >
            {num}
          </span>
          <span className="text-sm leading-relaxed pt-0.5">{renderInline(text)}</span>
        </div>
      )
      i++
      continue
    }

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre
          key={i}
          className="text-xs rounded-xl px-4 py-3 my-2 overflow-x-auto"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', color: '#00D4FF', fontFamily: 'monospace' }}
        >
          {lang && <span className="text-[10px] text-muted block mb-1">{lang}</span>}
          {codeLines.join('\n')}
        </pre>
      )
      i++
      continue
    }

    // Heading: ## or **bold line**
    if (line.startsWith('## ') || line.startsWith('### ')) {
      const text = line.replace(/^#{2,3}\s+/, '')
      elements.push(
        <p key={i} className="text-sm font-semibold text-white mt-3 mb-1">
          {renderInline(text)}
        </p>
      )
      i++
      continue
    }

    // Bullet
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const text = line.slice(2)
      elements.push(
        <div key={i} className="flex items-start gap-2 my-0.5">
          <span className="mt-2 w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#C9A84C' }} />
          <span className="text-sm leading-relaxed">{renderInline(text)}</span>
        </div>
      )
      i++
      continue
    }

    // Blank line
    if (!line.trim()) {
      elements.push(<div key={i} className="h-1.5" />)
      i++
      continue
    }

    // Normal paragraph
    elements.push(
      <p key={i} className="text-sm leading-relaxed">
        {renderInline(line)}
      </p>
    )
    i++
  }

  return elements
}

function renderInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded text-[12px]"
          style={{ background: 'rgba(0,0,0,0.35)', color: '#00D4FF', fontFamily: 'monospace' }}>
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
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
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #D4A820, #C9A84C)'
            : 'linear-gradient(135deg, #00D4FF, #00FF9D)',
          color: isUser ? '#03050D' : '#FFFFFF',
        }}
      >
        {isUser ? 'S' : 'J'}
      </div>

      {/* Bubble */}
      <div className={clsx('flex flex-col gap-1', isUser ? 'items-end max-w-[72%]' : 'max-w-[82%]')}>
        <div
          className={clsx(
            'px-4 py-3',
            isUser
              ? 'rounded-[14px] rounded-tr-sm'
              : 'rounded-[14px] rounded-tl-sm',
          )}
          style={
            isUser
              ? {
                  background: 'linear-gradient(135deg, #D4A820, #C9A84C)',
                  color: '#03050D',
                  boxShadow: '0 4px 16px rgba(201,168,76,0.28)',
                }
              : {
                  background: 'rgba(13,18,32,0.9)',
                  border: '1px solid rgba(201,168,76,0.12)',
                  color: '#E8F0FF',
                }
          }
        >
          {isUser
            ? content.split('\n').map((line, i) => (
                <p key={i} className={clsx('text-sm', i > 0 && 'mt-1.5')}>{line}</p>
              ))
            : renderContent(content)
          }
        </div>

        {timestamp && (
          <span className="text-[10px] px-1" style={{ color: 'rgba(90,116,153,0.6)' }}>
            {timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </motion.div>
  )
}
