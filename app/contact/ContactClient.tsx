'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, Building2, Shield, CheckCircle, Loader2, AlertCircle, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { Zap, ArrowLeft } from 'lucide-react'

const CATEGORIES = [
  'General support',
  'Billing issue',
  'School / bulk licensing',
  'Privacy / data request',
  'Bug report',
  'Feature request',
  'Other',
]

const SUPPORT_CARDS = [
  { icon: Mail,      label: 'General Support',          email: 'support@synaptiqai.co.uk',  color: '#4F8CFF' },
  { icon: Phone,     label: 'Billing & Payments',        email: 'billing@synaptiqai.co.uk',  color: '#22C55E' },
  { icon: Building2, label: 'Schools & Licensing',       email: 'schools@synaptiqai.co.uk',  color: '#A78BFA' },
  { icon: Shield,    label: 'Privacy & Data',            email: 'privacy@synaptiqai.co.uk',  color: '#f59e0b' },
]

const FAQS = [
  { q: 'How do I cancel my subscription?', a: 'Go to Settings → Subscription and click "Cancel plan". Your access continues until the end of the current billing period.' },
  { q: 'Can I get a refund?', a: 'We do not offer partial-month refunds, but if you have a problem please contact billing@synaptiqai.co.uk and we will do our best to help.' },
  { q: 'My child is under 13 — is that okay?', a: 'We require verifiable parental consent for users under 13. Email privacy@synaptiqai.co.uk to set this up.' },
  { q: 'Is the AI always accurate?', a: 'AI can make mistakes. Always verify important answers, especially for exams. Use Synaptiq as a study aid, not a replacement for your teacher.' },
  { q: 'Can I use Synaptiq for my whole school?', a: 'Yes! We offer school licences from £200/month for up to 60 seats. Email schools@synaptiqai.co.uk for a quote.' },
  { q: 'What subjects does Synaptiq cover?', a: 'Currently A-Level Maths (AQA, Edexcel, OCR, WJEC). More subjects coming soon.' },
  { q: 'Does the AI do my homework for me?', a: "Synaptiq explains concepts and guides you step-by-step — it's a tutor, not a homework completion service. Submitting AI output as your own work violates your school's academic integrity policy." },
]

export default function ContactClient() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setStatus('loading')

    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, category, message }),
    })
    const data = await res.json()

    if (!res.ok) {
      setErrorMsg(data.error || 'Something went wrong. Please try again.')
      setStatus('error')
    } else {
      setStatus('success')
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0B0F14' }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
        style={{ background: 'rgba(11,15,20,0.92)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#4F8CFF,#22C55E)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-white">Synaptiq</span>
        </Link>
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm no-underline" style={{ color: '#9AA4AF' }}>
          <ArrowLeft className="w-4 h-4" />
          Back to app
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-14">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3" style={{ color: '#F0EEF8' }}>How can we help?</h1>
          <p className="text-sm" style={{ color: '#9AA4AF' }}>Our team typically replies within one business day.</p>
        </div>

        {/* Support cards */}
        <div className="grid grid-cols-2 gap-4 mb-12 sm:grid-cols-4">
          {SUPPORT_CARDS.map(({ icon: Icon, label, email: addr, color }) => (
            <motion.a
              key={addr}
              href={`mailto:${addr}`}
              whileHover={{ y: -2 }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl text-center no-underline transition-colors"
              style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-xs font-medium" style={{ color: '#F0EEF8' }}>{label}</p>
              <p className="text-xs break-all" style={{ color: '#6B7394' }}>{addr}</p>
            </motion.a>
          ))}
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Contact form */}
          <div>
            <h2 className="text-lg font-semibold mb-5" style={{ color: '#F0EEF8' }}>Send us a message</h2>

            {status === 'success' ? (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-3 py-12 text-center"
              >
                <CheckCircle className="w-10 h-10" style={{ color: '#22C55E' }} />
                <p className="font-semibold" style={{ color: '#F0EEF8' }}>Message sent!</p>
                <p className="text-sm" style={{ color: '#9AA4AF' }}>We&apos;ll get back to you within one business day.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {status === 'error' && errorMsg && (
                  <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <Field label="Your name">
                  <input
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
                  />
                </Field>

                <Field label="Email address">
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
                  />
                </Field>

                <Field label="Category">
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                    style={{ background: 'rgba(18,24,33,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: category ? '#F0EEF8' : '#6B7394' }}
                  >
                    <option value="" disabled style={{ background: '#121821' }}>Select a category…</option>
                    {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#121821' }}>{c}</option>)}
                  </select>
                </Field>

                <Field label="Message">
                  <textarea
                    required
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={5}
                    placeholder="Describe your question or issue…"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
                  />
                </Field>

                <motion.button
                  type="submit"
                  disabled={status === 'loading'}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#4F8CFF,#22C55E)', color: '#fff', opacity: status === 'loading' ? 0.6 : 1 }}
                >
                  {status === 'loading' ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send message'}
                </motion.button>
              </form>
            )}
          </div>

          {/* FAQ */}
          <div>
            <h2 className="text-lg font-semibold mb-5" style={{ color: '#F0EEF8' }}>Frequently asked questions</h2>
            <div className="space-y-2">
              {FAQS.map((faq, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden"
                  style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <motion.button
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <span className="text-sm font-medium pr-3" style={{ color: '#F0EEF8' }}>{faq.q}</span>
                    <motion.span
                      animate={{ rotate: openFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ flexShrink: 0 }}
                    >
                      <ChevronDown className="w-4 h-4" style={{ color: '#6B7394' }} />
                    </motion.span>
                  </motion.button>
                  {openFaq === i && (
                    <div className="px-4 pb-4">
                      <p className="text-sm leading-relaxed" style={{ color: '#9AA4AF' }}>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-8 mt-4" style={{ borderColor: 'rgba(255,255,255,0.06)', color: '#6B7394' }}>
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap gap-4 text-xs">
          <span>© {new Date().getFullYear()} Synaptiq Ltd</span>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
        </div>
      </footer>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#9AA4AF' }}>{label}</label>
      {children}
    </div>
  )
}
