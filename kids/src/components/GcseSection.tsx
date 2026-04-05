'use client'

import { useState } from 'react'

interface GcseQuestion {
  question: string
  solution: string
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px',
  padding: '24px',
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.45)',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  marginBottom: '8px',
  display: 'block',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
  cursor: 'pointer',
}

export default function GcseSection() {
  const [topic, setTopic] = useState('Mixed')
  const [tier, setTier] = useState('Higher')
  const [marks, setMarks] = useState('3-4')
  const [result, setResult] = useState<GcseQuestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    setShowSolution(false)

    try {
      const res = await fetch('/api/generate-gcse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, tier, marks }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? 'Failed to generate question.')
      } else {
        setResult(data)
        setQuestionCount((c) => c + 1)
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '28px' }}>🎓</span>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #00D4FF, #7B40FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0,
            }}
          >
            GCSE Maths
          </h1>
          {questionCount > 0 && (
            <span
              style={{
                background: 'rgba(0,212,255,0.15)',
                border: '1px solid rgba(0,212,255,0.3)',
                borderRadius: '20px',
                padding: '3px 12px',
                fontSize: '12px',
                color: '#00D4FF',
                fontWeight: 600,
              }}
            >
              {questionCount} generated this session
            </span>
          )}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: '15px' }}>
          AI-generated exam-style questions tailored to your topic and tier
        </p>
      </div>

      {/* Controls */}
      <div style={{ ...cardStyle, marginBottom: '24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '20px',
            marginBottom: '20px',
          }}
        >
          <div>
            <label style={labelStyle}>Topic</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={selectStyle}
            >
              <option value="Number">Number</option>
              <option value="Algebra">Algebra</option>
              <option value="Geometry">Geometry</option>
              <option value="Statistics">Statistics</option>
              <option value="Ratio">Ratio &amp; Proportion</option>
              <option value="Mixed">Mixed Topics</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              style={selectStyle}
            >
              <option value="Foundation">Foundation</option>
              <option value="Higher">Higher</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Marks</label>
            <select
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              style={selectStyle}
            >
              <option value="1-2">1–2 marks</option>
              <option value="3-4">3–4 marks</option>
              <option value="5-6">5–6 marks</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            background: loading ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #00D4FF, #7B40FF)',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 28px',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {loading ? (
            <>
              <span>Generating</span>
              <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span className="loading-dot" />
                <span className="loading-dot" />
                <span className="loading-dot" />
              </span>
            </>
          ) : (
            '✨ Generate Question'
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: 'rgba(255,80,80,0.08)',
            border: '1px solid rgba(255,80,80,0.25)',
            borderRadius: '14px',
            padding: '16px 20px',
            color: '#ff6b6b',
            fontSize: '14px',
            marginBottom: '24px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Question Card */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              ...cardStyle,
              borderLeft: '3px solid #00D4FF',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#00D4FF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                }}
              >
                📋 Question — {tier} Tier · {topic} · {marks} marks
              </span>
            </div>
            <p
              style={{
                fontSize: '16px',
                lineHeight: '1.7',
                color: 'rgba(255,255,255,0.9)',
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}
            >
              {result.question}
            </p>
          </div>

          {/* Show Solution Button */}
          {!showSolution && result.solution && (
            <button
              onClick={() => setShowSolution(true)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(123,64,255,0.4)',
                borderRadius: '10px',
                padding: '10px 24px',
                color: '#7B40FF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                alignSelf: 'flex-start',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(123,64,255,0.1)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              👁 Show Solution
            </button>
          )}

          {/* Solution Card */}
          {showSolution && result.solution && (
            <div
              style={{
                ...cardStyle,
                borderLeft: '3px solid #7B40FF',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#7B40FF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  display: 'block',
                  marginBottom: '16px',
                }}
              >
                ✅ Model Solution
              </span>
              <p
                style={{
                  fontSize: '15px',
                  lineHeight: '1.8',
                  color: 'rgba(255,255,255,0.85)',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                }}
              >
                {result.solution}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div
          style={{
            ...cardStyle,
            textAlign: 'center',
            padding: '60px 24px',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎓</div>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px', margin: 0 }}>
            Select your options above and click Generate Question to begin
          </p>
        </div>
      )}
    </div>
  )
}
