'use client'

import { useState } from 'react'
import Link from 'next/link'

const CATEGORIES = [
  'General support',
  'Billing issue',
  'School / bulk licensing',
  'Privacy / data request',
  'Bug report',
  'Feature request',
  'Other',
]

const CONTACT_CARDS = [
  { icon: '🎓', title: 'General Support', sub: 'Help with the platform, your account, or learning features.', href: 'mailto:hello@synaptiq.co.uk', label: 'hello@synaptiq.co.uk' },
  { icon: '💳', title: 'Billing & Payments', sub: 'Questions about your subscription, invoices, or refunds.', href: 'mailto:billing@synaptiq.co.uk', label: 'billing@synaptiq.co.uk' },
  { icon: '🏫', title: 'Schools & Licensing', sub: 'Site licences, teacher dashboards, and school partnerships.', href: '/schools', label: 'See school plans →' },
  { icon: '🔒', title: 'Privacy & Data', sub: 'GDPR requests, data deletion, or privacy questions.', href: 'mailto:privacy@synaptiqai.co.uk', label: 'privacy@synaptiqai.co.uk' },
]

const FAQ = [
  {
    q: 'Is Jarvis actually helpful for A-Level revision?',
    a: 'Yes — Jarvis is trained on A-Level Maths across all major UK exam boards (AQA, Edexcel, OCR, WJEC) and uses a Socratic teaching style to guide you to answers rather than just giving them.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'Go to Settings → Billing and click "Cancel subscription". Your access continues until the end of the billing period.',
  },
  {
    q: 'Can my school or tutor get a bulk licence?',
    a: 'Yes! Visit our Schools page or email hello@synaptiq.co.uk with your school name and number of students.',
  },
  {
    q: 'I found an error in an AI response. What should I do?',
    a: 'Please use the contact form below and select "Bug report". Include the topic and the incorrect response so we can improve.',
  },
]

export default function ContactClient() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, category, message }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error ?? 'Something went wrong — please try again.')
      } else {
        setStatus('success')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error — please check your connection and try again.')
    }
  }

  return (
    <div style={{ background: '#08090E', color: '#E8F0FF', minHeight: '100vh', fontFamily: '\'DM Sans\', system-ui, sans-serif' }}>
      {/* Nav */}
      <header style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link href="/" style={{ fontFamily: '\'Syne\', sans-serif', fontSize: '1.4rem', fontWeight: 800, color: '#C9A84C', textDecoration: 'none' }}>Synaptiq</Link>
        <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="/pricing" style={{ color: '#6B7394', textDecoration: 'none', fontSize: '0.875rem' }}>Pricing</Link>
          <Link href="/schools" style={{ color: '#6B7394', textDecoration: 'none', fontSize: '0.875rem' }}>For Schools</Link>
          <Link href="/login" style={{ background: 'linear-gradient(135deg, #C9A84C, #A07830)', color: '#08090E', padding: '0.5rem 1.25rem', borderRadius: 10, fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
        </nav>
      </header>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '4rem 1.5rem 3rem' }}>
        <h1 style={{ fontFamily: '\'Syne\', sans-serif', fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>How can we help?</h1>
        <p style={{ color: '#6B7394', maxWidth: 500, margin: '0 auto' }}>We&apos;re a small team — we read every message and reply within 24 hours on weekdays.</p>
      </div>

      {/* Contact cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', maxWidth: 900, margin: '0 auto', padding: '0 1.5rem 3rem' }}>
        {CONTACT_CARDS.map(c => (
          <div key={c.title} style={{ background: 'rgba(13,17,32,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '2rem', textAlign: 'center', transition: 'border-color 0.2s' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{c.icon}</div>
            <h3 style={{ fontFamily: '\'Syne\', sans-serif', fontWeight: 700, marginBottom: '0.5rem' }}>{c.title}</h3>
            <p style={{ color: '#6B7394', fontSize: '0.875rem', marginBottom: '1.25rem' }}>{c.sub}</p>
            <a href={c.href} style={{ color: '#C9A84C', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>{c.label}</a>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 1.5rem 4rem' }}>
        <h2 style={{ fontFamily: '\'Syne\', sans-serif', fontWeight: 700, fontSize: '1.4rem', marginBottom: '1.5rem' }}>Frequently Asked Questions</h2>
        {FAQ.map(f => (
          <details key={f.q} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '0.5rem 0', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {f.q}
              <span style={{ color: '#C9A84C', marginLeft: '0.5rem', flexShrink: 0 }}>+</span>
            </summary>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginTop: '0.75rem', lineHeight: 1.6 }}>{f.a}</p>
          </details>
        ))}
      </div>

      {/* Contact form */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 1.5rem 6rem' }}>
        <h2 style={{ fontFamily: '\'Syne\', sans-serif', fontWeight: 700, fontSize: '1.4rem', marginBottom: '1.5rem' }}>Send us a message</h2>

        {status === 'success' ? (
          <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
            <h3 style={{ fontFamily: '\'Syne\', sans-serif', fontWeight: 700, marginBottom: '0.5rem' }}>Message sent!</h3>
            <p style={{ color: '#6B7394', fontSize: '0.9rem' }}>We&apos;ll get back to you within 24 hours on weekdays.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={labelStyle}>Your name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required style={inputStyle} />

            <label style={labelStyle}>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required style={inputStyle} />

            <label style={labelStyle}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <label style={labelStyle}>Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder="Tell us what&apos;s going on..." required style={{ ...inputStyle, resize: 'vertical' }} />

            {status === 'error' && errorMsg && (
              <p style={{ color: '#FB7185', fontSize: '0.85rem', marginBottom: '1rem' }}>{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                width: '100%', background: 'linear-gradient(135deg, #C9A84C, #A07830)',
                color: '#08090E', border: 'none', borderRadius: 12, padding: '0.875rem',
                fontSize: '1rem', fontWeight: 700, cursor: status === 'loading' ? 'wait' : 'pointer',
                opacity: status === 'loading' ? 0.7 : 1,
              }}
            >
              {status === 'loading' ? 'Sending…' : 'Send message →'}
            </button>
          </form>
        )}
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '2rem 1.5rem', textAlign: 'center', color: '#6B7394', fontSize: '0.875rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: '#6B7394', textDecoration: 'none' }}>Home</Link>
          <Link href="/pricing" style={{ color: '#6B7394', textDecoration: 'none' }}>Pricing</Link>
          <Link href="/schools" style={{ color: '#6B7394', textDecoration: 'none' }}>Schools</Link>
          <Link href="/privacy" style={{ color: '#6B7394', textDecoration: 'none' }}>Privacy</Link>
          <Link href="/terms" style={{ color: '#6B7394', textDecoration: 'none' }}>Terms</Link>
        </div>
        <p>&copy; 2026 Synaptiq Ltd</p>
      </footer>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7394', marginBottom: '0.4rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(13,17,32,0.9)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10, padding: '0.75rem 1rem', color: '#F0EEF8',
  fontFamily: '\'DM Sans\', system-ui, sans-serif', fontSize: '0.9rem',
  marginBottom: '1rem', outline: 'none', boxSizing: 'border-box',
}
