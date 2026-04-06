'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

// ─── Constants ────────────────────────────────────────────────────────────────

const GOLD = '#C9A84C'
const MUTED = '#5A7499'
const BG = '#03050D'

const TOPICS = [
  'Differentiation', 'Integration', 'Binomial Expansion', 'Normal Distribution',
  'Mechanics', 'Trigonometry', 'Vectors', 'Proof by Contradiction',
]

const FEATURES = [
  { icon: '🤖', title: 'A-Level Maths AI Tutor', desc: 'Ask anything. Get full working shown step by step — exactly how a mark scheme expects it. Covers Pure, Stats and Mechanics.', tag: 'Synaptiq AI' },
  { icon: '📚', title: 'Complete Content Library', desc: 'Every chapter organised by module — Pure 1, Pure 2, Statistics Year 1 & 2, Mechanics Year 1 & 2. Click any chapter to study with AI.', tag: 'All Chapters' },
  { icon: '📄', title: 'Upload Mark Schemes & Past Papers', desc: 'Upload your exam board\'s mark scheme. The AI reads it and gives answers aligned to exactly how your board awards marks.', tag: 'AQA · Edexcel · OCR' },
  { icon: '📝', title: 'A-Level Question Generator', desc: 'Generate exam-style A-Level Maths questions for any topic, difficulty, and exam board. Full working and hints included.', tag: 'Exam-Style' },
  { icon: '🎯', title: 'Topic Strength Analysis', desc: 'Claude identifies your weak spots across A-Level topics and builds you a personalised revision priority list.', tag: 'AI Analysis' },
  { icon: '🧮', title: 'Visual Maths & Dyscalculia Support', desc: 'Visual number lines, colour-coded working, step-by-step breakdowns. Full accessibility for ADHD and dyslexia too.', tag: 'Accessibility' },
  { icon: '⭐', title: 'Mark Scheme Coach', desc: 'Paste any mark scheme. Synaptiq decodes exactly WHY each point earns marks — with model answers, key phrases, and examiner tips.', tag: 'Unique to Synaptiq' },
  { icon: '📝', title: 'Command Words Guide', desc: '"Evaluate", "Assess", "Explain" — master what each command word demands. Includes AI-marked practice so you know you\'re doing it right.', tag: 'Exam Technique' },
  { icon: '⚡', title: 'Quick Blitz & Spaced Repetition', desc: '5-question rapid blitz mode and 60+ pre-built A-Level Maths flashcard packs using science-backed spaced repetition.', tag: 'Proven Revision' },
  { icon: '✅', title: 'Topic Revision Checklist', desc: 'Rate your confidence on all 34 A-Level Maths spec topics. Radar chart shows your coverage across Pure, Stats and Mechanics at a glance.', tag: 'Track Everything' },
  { icon: '🩺', title: 'Diagnostic Test & Grade Predictor', desc: 'Take a 12-question placement test to reveal your current level. AI predicts your grade and generates a personalised revision action plan.', tag: 'Know Your Level' },
  { icon: '🔥', title: 'Daily Challenge & Study Streaks', desc: '5 questions every day. Build study streaks, earn XP, unlock achievements. A habit loop designed to keep you consistent right up to exam day.', tag: 'Stay Consistent' },
]

const TESTIMONIALS = [
  { initial: 'E', color: '#C9A84C', secondColor: '#8B6914', name: 'Emily R.', detail: 'Year 13 · AQA A-Level Maths · Now studying Engineering at Bath', borderColor: '#C9A84C', text: 'I went from a D to a B in Pure Maths in just 6 weeks. The AI shows full working exactly like the mark scheme — I finally understood why I kept losing marks. Differentiation clicked on day 3.' },
  { initial: 'J', color: '#00D4FF', secondColor: '#0ea5e9', name: 'Jake T.', detail: 'Year 12 · Edexcel A-Level Maths · Predicted A*', borderColor: '#00D4FF', text: 'Uploading the Edexcel mark scheme was a game changer. Now when I ask about integration by parts, it explains exactly how Edexcel awards the method marks. I got full marks on my mock.' },
  { initial: 'A', color: '#A78BFA', secondColor: '#7c3aed', name: 'Aisha M.', detail: 'Year 13 · OCR A-Level Maths · Grade improved from C to A', borderColor: '#A78BFA', text: 'The chapter navigator is perfect. I can jump to any topic and Synaptiq walks through the theory, shows worked examples, then gives me questions to try. It\'s like a private tutor but 24/7.' },
  { initial: 'M', color: '#00FF9D', secondColor: '#0f766e', name: 'Marcus W.', detail: 'Year 12 · AQA A-Level Maths · Dyscalculia support user', borderColor: '#00FF9D', text: 'As someone with dyscalculia, I always struggled with maths. The visual number line and colour-coded working in dyscalculia mode made everything so much clearer. First time I\'ve actually enjoyed revision.' },
  { initial: 'P', color: '#f97316', secondColor: '#c2410c', name: 'Patricia J.', detail: 'Parent · Daughter in Year 13 · Edexcel Maths', borderColor: '#f97316', text: 'My daughter was really struggling with Statistics. Since using Synaptiq she\'s gone from barely passing to getting 78% on her last test. The progress tracking lets me see exactly what she\'s been working on.' },
  { initial: 'S', color: '#ec4899', secondColor: '#9d174d', name: 'Sophie L.', detail: 'Year 13 · OCR A-Level Maths & Further Maths', borderColor: '#ec4899', text: 'I use Synaptiq every evening before bed — ask it to explain whatever we covered in class that day. My teacher actually commented on how much better my working is. The question generator for exam practice is brilliant.' },
]

const SUBJECTS = [
  { icon: '📘', name: 'Pure 1', level: 'Year 12' },
  { icon: '📗', name: 'Pure 2', level: 'Year 13' },
  { icon: '📊', name: 'Statistics Y1', level: 'Year 12' },
  { icon: '📈', name: 'Statistics Y2', level: 'Year 13' },
  { icon: '⚙️', name: 'Mechanics Y1', level: 'Year 12' },
  { icon: '🔧', name: 'Mechanics Y2', level: 'Year 13' },
  { icon: '📄', name: 'Past Papers', level: 'All Boards' },
  { icon: '✅', name: 'Mark Schemes', level: 'AI Aligned' },
]

const FAQ_ITEMS = [
  { q: 'Is there actually a free trial? Do I need a card?', a: 'Yes — 7 days completely free. Your card is stored securely via Stripe but not charged until the trial ends. Cancel any time with one click. No questions asked.' },
  { q: 'How is Synaptiq different from ChatGPT?', a: "ChatGPT is a general assistant. Synaptiq is trained specifically on A-Level Maths curricula — it knows AQA, Edexcel, OCR and WJEC mark schemes, shows working exactly how examiners expect it, tracks your progress over time, and won't hallucinate a GCSE answer when you ask an A-Level question." },
  { q: 'Which exam boards does Synaptiq cover?', a: 'AQA, Edexcel, OCR, and WJEC — all fully supported. You set your exam board during signup and every answer is aligned to that board\'s mark scheme style.' },
  { q: 'Can I use Synaptiq for both Year 12 and Year 13?', a: 'Yes. The full content library covers Pure 1 & 2, Statistics Y1 & Y2, and Mechanics Y1 & Y2 — so whether you\'re starting AS or finishing A2, every topic is covered.' },
  { q: 'What if I get the same question wrong repeatedly?', a: 'Synaptiq tracks your weak spots and surfaces them through the spaced-repetition flashcard system. The more you practice, the smarter your personalised revision plan becomes.' },
  { q: 'Is Synaptiq suitable if I have ADHD, dyslexia, or dyscalculia?', a: 'Yes — these are first-class features, not afterthoughts. ADHD mode breaks responses into shorter, focused steps. Dyslexia mode uses Lexend font with increased spacing. Dyscalculia mode adds colour-coded working and visual number lines.' },
  { q: 'How much does it cost after the trial?', a: '£35/month (about £1.17/day), or £276/year (£23/month, saving 34%). For context, the average A-Level Maths tutor on Tutorful charges £41.59/hour — Synaptiq gives you unlimited 24/7 access for less than the cost of a single tutoring session per month.' },
  { q: 'Can parents see how their child is progressing?', a: 'Yes. Students can open the Parent View from their dashboard at any time and email a progress report directly to a parent or guardian. The report includes study streak, questions answered, XP earned, and the specific topics needing most attention — no account needed for the parent.' },
  { q: 'Can my school or college get Synaptiq?', a: 'Yes. We offer custom pricing for schools, sixth forms, and tuition centres with whole-class accounts, teacher dashboards, and invoice billing. Email schools@synaptiqai.co.uk or click "Book a Demo" on the pricing section.' },
]

const EXAM_CHIPS = ['📐 Product rule', '∫ Integration by parts', '🔢 Binomial expansion', '📊 Hypothesis testing']
const DEMO_QUESTIONS = [
  'How do I differentiate x³sin(x) using the product rule?',
  'Explain integration by parts with a worked example',
  'What is the binomial expansion of (1+x)^n?',
  'How do I solve a hypothesis test using the normal distribution?',
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExamBadges({ color = GOLD }: { color?: string }) {
  return (
    <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
      {['AQA', 'Edexcel', 'OCR', 'WJEC', 'OCR MEI'].map(b => (
        <span
          key={b}
          style={{
            background: `rgba(${color === GOLD ? '201,168,76' : '255,255,255'},.06)`,
            border: `1px solid rgba(${color === GOLD ? '201,168,76' : '255,255,255'},.1)`,
            borderRadius: 8,
            padding: '.5rem 1.4rem',
            fontWeight: 800,
            fontSize: '.95rem',
            letterSpacing: '.03em',
          }}
        >
          {b}
        </span>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HomeClient() {
  const [activeTopicIdx, setActiveTopicIdx] = useState(0)
  const [isAnnual, setIsAnnual] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello! Ask me any A-Level Maths question — I\'ll show you full working, step by step, exactly as a mark scheme expects. 🎓' },
  ])
  const [demoInput, setDemoInput] = useState('')
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoCount, setDemoCount] = useState(0)
  const chatRef = useRef<HTMLDivElement>(null)

  // Rotate topic chips
  useEffect(() => {
    const id = setInterval(() => setActiveTopicIdx(i => (i + 1) % TOPICS.length), 2000)
    return () => clearInterval(id)
  }, [])

  // Scroll chat to bottom
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [chatMessages])

  const sendDemo = useCallback(async (text: string) => {
    const q = text.trim()
    if (!q || demoLoading) return
    if (demoCount >= 3) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: '🔒 You\'ve used your 3 free demo questions. Sign up for unlimited access — 7-day free trial, no card charge until day 8.',
      }])
      return
    }

    setDemoInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: q }])
    setDemoLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: q }],
          systemPrompt: 'You are an expert A-Level Maths tutor. Show full working step by step, exactly as a UK mark scheme expects. Keep responses focused and clear.',
        }),
      })

      if (res.status === 401 || res.status === 403) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: '👋 Great question! To see the full step-by-step working, sign up for a free 7-day trial. No card charged for 7 days — cancel any time.',
        }])
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: data.error ?? 'Sorry, I couldn\'t process that right now. Sign up to get full access.',
        }])
      } else {
        const data = await res.json() as { response?: string }
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response ?? 'Sign up for the full answer!',
        }])
        setDemoCount(c => c + 1)
      }
    } catch {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Hmm, couldn\'t reach the AI right now. Sign up for guaranteed full access — 7-day free trial.',
      }])
    } finally {
      setDemoLoading(false)
    }
  }, [demoCount, demoLoading])

  return (
    <div style={{ background: BG, color: '#E6EDF3', fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(11,15,20,0.85)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '.875rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', fontWeight: 800, fontSize: '1.1rem', color: '#E6EDF3' }}>
          Synapti<span style={{ color: GOLD }}>q</span>
        </Link>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: '.9rem', transition: 'color .15s' }}
            onMouseOver={e => (e.currentTarget.style.color = '#E6EDF3')}
            onMouseOut={e => (e.currentTarget.style.color = MUTED)}>
            Home
          </Link>
          <a href="#features" style={{ color: MUTED, textDecoration: 'none', fontSize: '.9rem', transition: 'color .15s' }}
            onMouseOver={e => (e.currentTarget.style.color = '#E6EDF3')}
            onMouseOut={e => (e.currentTarget.style.color = MUTED)}>
            Features
          </a>
          <a href="#pricing" style={{ color: MUTED, textDecoration: 'none', fontSize: '.9rem', transition: 'color .15s' }}
            onMouseOver={e => (e.currentTarget.style.color = '#E6EDF3')}
            onMouseOut={e => (e.currentTarget.style.color = MUTED)}>
            Pricing
          </a>
        </div>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <Link
            href="/login"
            style={{
              padding: '.45rem 1.1rem', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#E6EDF3',
              textDecoration: 'none', fontSize: '.875rem', fontWeight: 600,
              transition: 'border-color .15s',
            }}
            onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)')}
            onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          >
            Log In
          </Link>
          <Link
            href="/login?mode=register"
            style={{
              padding: '.45rem 1.1rem', borderRadius: 10,
              background: `linear-gradient(135deg, ${GOLD}, #8B6914)`,
              color: '#0B0F14', textDecoration: 'none',
              fontSize: '.875rem', fontWeight: 700,
            }}
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: '5rem 2rem 4rem', maxWidth: 900, margin: '0 auto' }}>
        <div style={{
          display: 'inline-block', background: 'rgba(201,168,76,0.1)',
          border: '1px solid rgba(201,168,76,0.25)', borderRadius: 20,
          padding: '.35rem 1rem', fontSize: '.82rem', fontWeight: 700,
          color: GOLD, marginBottom: '1.5rem',
        }}>
          ⭐ Trusted by 2,400+ UK A-Level students · AQA · Edexcel · OCR
        </div>

        <h1 style={{
          fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', fontWeight: 900, lineHeight: 1.15,
          marginBottom: '1.25rem', letterSpacing: '-.02em',
        }}>
          The only AI tutor that<br />
          knows <em style={{ fontStyle: 'normal', background: `linear-gradient(135deg, ${GOLD} 0%, #F0D080 50%, ${GOLD} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>your exact mark scheme</em>
        </h1>

        <p style={{ color: MUTED, fontSize: '1.05rem', maxWidth: 620, margin: '0 auto 2rem', lineHeight: 1.7 }}>
          Get the same step-by-step working a marker awards full marks for — tailored to your exam board, your year, and your weak topics. Available 24/7. Less than the cost of a single tutoring session per month.
        </p>

        {/* Topic chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '.5rem', marginBottom: '2rem' }}>
          {TOPICS.map((t, i) => (
            <span
              key={t}
              style={{
                padding: '.35rem .9rem', borderRadius: 20,
                fontSize: '.8rem', fontWeight: 600, transition: 'all .3s',
                background: i === activeTopicIdx ? `rgba(201,168,76,.15)` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${i === activeTopicIdx ? 'rgba(201,168,76,.4)' : 'rgba(255,255,255,0.08)'}`,
                color: i === activeTopicIdx ? GOLD : MUTED,
              }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <Link
            href="/login?mode=register"
            style={{
              padding: '.85rem 2rem', borderRadius: 12,
              background: `linear-gradient(135deg, ${GOLD}, #8B6914)`,
              color: '#0B0F14', textDecoration: 'none',
              fontSize: '1rem', fontWeight: 800,
              boxShadow: '0 8px 32px rgba(201,168,76,0.3)',
            }}
          >
            Start Your Free Trial →
          </Link>
          <a
            href="#how-it-works"
            style={{
              padding: '.85rem 2rem', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: '#E6EDF3', textDecoration: 'none',
              fontSize: '1rem', fontWeight: 600,
            }}
          >
            ▶ See How It Works
          </a>
        </div>

        {/* Trust bar */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {[
            { label: '7-day free trial', sub: 'No charge until day 8' },
            { label: 'AQA · Edexcel · OCR · WJEC', sub: 'All exam boards' },
            { label: 'ADHD · Dyslexia · Dyscalculia', sub: 'Accessibility features' },
            { label: '4.9 ★', sub: 'Average student rating' },
          ].map(({ label, sub }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#E6EDF3' }}>{label}</div>
              <div style={{ fontSize: '.72rem', color: MUTED }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Student count */}
        <div style={{
          display: 'inline-block',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: '.4rem 1.25rem', fontSize: '.85rem', color: MUTED,
        }}>
          🎓 Join <strong style={{ color: '#E6EDF3' }}>2,390+</strong> students already improving their grades
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '5rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.015)' }}>
        <div style={{
          display: 'inline-block', background: 'rgba(201,168,76,0.08)',
          border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20,
          padding: '.25rem .85rem', fontSize: '.72rem', fontWeight: 700,
          color: GOLD, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1rem',
        }}>
          Simple 3-step process
        </div>
        <h2 style={{ fontSize: 'clamp(1.8rem,3vw,2.6rem)', fontWeight: 900, marginBottom: '.5rem' }}>How It Works</h2>
        <p style={{ color: MUTED, marginBottom: '3rem', maxWidth: 500, margin: '0 auto 3rem' }}>
          From zero to A* in three steps. Setup takes under 2 minutes.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
          {[
            { icon: '🎯', step: '01', title: 'Set your exam board', desc: 'Tell Synaptiq your exam board, year group, and target grade. Takes 60 seconds.' },
            { icon: '🤖', step: '02', title: 'Ask anything 24/7', desc: 'Ask questions, upload past papers, practice topics. Get full mark-scheme working every time.' },
            { icon: '📈', step: '03', title: 'Track & improve', desc: 'See your mastery grow. Synaptiq spots patterns, surfaces weak topics, and builds your revision plan.' },
          ].map(({ icon, step, title, desc }) => (
            <div
              key={step}
              style={{
                background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20, padding: '2rem 1.5rem', textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{icon}</div>
              <div style={{ fontSize: '.72rem', color: GOLD, fontWeight: 700, letterSpacing: '.1em', marginBottom: '.5rem' }}>STEP {step}</div>
              <h3 style={{ fontWeight: 700, marginBottom: '.5rem' }}>{title}</h3>
              <p style={{ color: MUTED, fontSize: '.9rem', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '5rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{
            display: 'inline-block', background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20,
            padding: '.25rem .85rem', fontSize: '.72rem', fontWeight: 700,
            color: GOLD, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1rem',
          }}>
            What&apos;s inside
          </div>
        </div>
        <h2 style={{ fontSize: 'clamp(1.8rem,3vw,2.6rem)', fontWeight: 900, textAlign: 'center', marginBottom: '.75rem' }}>
          Everything you need to<br />
          <span style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #F0D080 50%, ${GOLD} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ace A-Level Maths</span>
        </h2>
        <p style={{ color: MUTED, textAlign: 'center', marginBottom: '3rem', fontSize: '.95rem' }}>
          From Pure 1 to Mechanics — Synaptiq covers every topic, every exam board, every mark scheme.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {FEATURES.map(({ icon, title, desc, tag }) => (
            <Link
              key={title}
              href="/login?mode=register"
              style={{
                background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 18, padding: '1.5rem', textDecoration: 'none', color: 'inherit',
                display: 'block', transition: 'border-color .2s',
              }}
              onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)')}
              onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: '.75rem' }}>{icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: '.5rem', fontSize: '.975rem' }}>{title}</h3>
              <p style={{ color: MUTED, fontSize: '.85rem', lineHeight: 1.65, marginBottom: '.75rem' }}>{desc}</p>
              <span style={{
                display: 'inline-block', background: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10,
                padding: '.2rem .65rem', fontSize: '.72rem', fontWeight: 600, color: GOLD,
              }}>{tag}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <section style={{ padding: '4rem 2rem', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
          {[
            { num: '2,400+', label: 'A-Level Maths Students' },
            { num: '97%', label: 'Would Recommend Synaptiq' },
            { num: '180+', label: 'A-Level Topics Covered' },
            { num: '+2 grades', label: 'Average Improvement' },
          ].map(({ num, label }) => (
            <div
              key={label}
              style={{
                textAlign: 'center', padding: '1.5rem', borderRadius: 18,
                background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.1)',
                transition: 'border-color .3s',
              }}
            onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)')}
            onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.1)')}
            >
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: GOLD, marginBottom: '.25rem' }}>{num}</div>
              <div style={{ color: MUTED, fontSize: '.85rem' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Exam Board Trust Bar ─────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
        <p style={{ color: MUTED, fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '1.1rem' }}>
          Fully aligned to UK A-Level exam boards
        </p>
        <ExamBadges />
      </div>

      {/* ── Live AI Demo ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            display: 'inline-block', background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20,
            padding: '.25rem .85rem', fontSize: '.72rem', fontWeight: 700,
            color: GOLD, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1rem',
          }}>
            Try it right now — no account needed
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem,3vw,2.6rem)', fontWeight: 900, marginBottom: '.75rem' }}>Ask the AI Tutor anything</h2>
          <p style={{ color: MUTED, maxWidth: 520, margin: '.75rem auto 0', fontSize: '.95rem' }}>
            Type a real A-Level Maths question below. See exactly how Synaptiq explains it — full working, step-by-step, mark-scheme style.
          </p>
        </div>

        <div style={{
          background: 'rgba(12,14,20,0.88)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(201,168,76,0.2)', borderRadius: 24,
          overflow: 'hidden', maxWidth: 780, margin: '0 auto',
          boxShadow: '0 32px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(201,168,76,0.06)',
        }}>
          {/* Chat header */}
          <div style={{
            padding: '1rem 1.5rem', borderBottom: '1px solid rgba(201,168,76,0.1)',
            display: 'flex', alignItems: 'center', gap: '.75rem',
            background: 'rgba(255,255,255,0.02)',
          }}>
            <div style={{
              width: 32, height: 32,
              background: `linear-gradient(135deg, ${GOLD}, #8B6914)`,
              borderRadius: 8, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '.9rem',
            }}>✦</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.9rem' }}>Synaptiq AI Tutor</div>
              <div style={{ fontSize: '.72rem', color: '#4ADE80' }}>● A-Level Maths Specialist · Online</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '.4rem' }}>
              {['#ff5f57', '#ffbd2e', '#28c941'].map(c => (
                <div key={c} style={{ width: 10, height: 10, background: c, borderRadius: '50%' }} />
              ))}
            </div>
          </div>

          {/* Messages */}
          <div ref={chatRef} style={{ padding: '1.5rem', minHeight: 200, maxHeight: 360, overflowY: 'auto' }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: '.75rem', marginBottom: '1.25rem', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 28, height: 28,
                    background: `linear-gradient(135deg, ${GOLD}, #8B6914)`,
                    borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem',
                  }}>✦</div>
                )}
                <div style={{
                  background: msg.role === 'user' ? `rgba(201,168,76,0.15)` : 'rgba(12,14,20,0.82)',
                  border: msg.role === 'user' ? `1px solid rgba(201,168,76,0.3)` : 'none',
                  borderRadius: msg.role === 'user' ? '12px 0 12px 12px' : '0 12px 12px 12px',
                  padding: '.85rem 1.1rem', maxWidth: '85%',
                  fontSize: '.9rem', lineHeight: 1.7, color: msg.role === 'user' ? '#E6EDF3' : MUTED,
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {demoLoading && (
              <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.25rem' }}>
                <div style={{
                  width: 28, height: 28,
                  background: `linear-gradient(135deg, ${GOLD}, #8B6914)`,
                  borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem',
                }}>✦</div>
                <div style={{
                  background: 'rgba(12,14,20,0.82)', borderRadius: '0 12px 12px 12px',
                  padding: '.85rem 1.1rem', fontSize: '.9rem', color: MUTED,
                }}>
                  Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Example chips */}
          <div style={{ padding: '.75rem 1.5rem 0', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            {EXAM_CHIPS.map((chip, i) => (
              <button
                key={chip}
                onClick={() => sendDemo(DEMO_QUESTIONS[i])}
                style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, padding: '.3rem .75rem',
                  fontSize: '.72rem', color: MUTED, cursor: 'pointer', transition: 'all .2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.color = GOLD }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = MUTED }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '.75rem 1.5rem 1rem', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: '.75rem', display: 'flex', gap: '.75rem' }}>
            <input
              type="text"
              value={demoInput}
              onChange={e => setDemoInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendDemo(demoInput)}
              placeholder="Or type your own A-Level Maths question…"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                padding: '.7rem 1rem', color: '#E6EDF3', fontSize: '.875rem', outline: 'none',
                transition: 'border-color .2s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
            <button
              onClick={() => sendDemo(demoInput)}
              disabled={demoLoading}
              style={{
                padding: '.7rem 1.25rem', borderRadius: 10,
                background: `linear-gradient(135deg, ${GOLD}, #8B6914)`,
                color: '#0B0F14', fontWeight: 700, fontSize: '.875rem',
                border: 'none', cursor: demoLoading ? 'not-allowed' : 'pointer',
                opacity: demoLoading ? 0.6 : 1, whiteSpace: 'nowrap',
              }}
            >
              Ask ✦
            </button>
          </div>

          {/* Footer note */}
          <div style={{ padding: '0 1.5rem .75rem', textAlign: 'center', fontSize: '.72rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
            <span style={{ color: MUTED }}>Free demo · No account needed · Full AI responses</span>
            <span style={{ color: MUTED, fontWeight: 600 }}>{demoCount}/3 free questions used</span>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(1.8rem,3vw,2.6rem)', fontWeight: 900, textAlign: 'center', marginBottom: '.5rem' }}>
          Real students. Real results.
        </h2>
        <p style={{ color: MUTED, textAlign: 'center', marginBottom: '2rem', fontSize: '.95rem' }}>
          From D grades to A*s — here&apos;s what UK A-Level students say about Synaptiq
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {TESTIMONIALS.map(({ initial, color, secondColor, name, detail, borderColor, text }) => (
            <div
              key={name}
              style={{
                background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 18, padding: '1.5rem',
                borderTop: `3px solid ${borderColor}`,
              }}
            >
              <div style={{ color: GOLD, marginBottom: '.75rem', fontSize: '1.1rem' }}>★★★★★</div>
              <p style={{ color: MUTED, fontSize: '.9rem', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                &ldquo;{text}&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${color}, ${secondColor})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '.9rem', flexShrink: 0,
                }}>
                  {initial}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{name}</div>
                  <div style={{ color: MUTED, fontSize: '.78rem' }}>{detail}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust bar */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {[{ n: '4.9 ★', l: 'Average rating' }, { n: '2,400+', l: 'Active students' }, { n: '+2 grades', l: 'Avg improvement' }, { n: '97%', l: 'Would recommend' }].map(({ n, l }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: GOLD }}>{n}</div>
              <div style={{ fontSize: '.8rem', color: MUTED }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Exam board trust */}
        <div style={{ textAlign: 'center', paddingTop: '2rem', marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ color: MUTED, fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '1rem' }}>
            Aligned to all UK A-Level exam boards
          </p>
          <ExamBadges />
        </div>
      </section>

      {/* ── Subjects Grid ────────────────────────────────────────────────────── */}
      <section style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 900, marginBottom: '2rem' }}>
          Everything in A-Level Maths, organised
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1rem', maxWidth: 800, margin: '0 auto' }}>
          {SUBJECTS.map(({ icon, name, level }) => (
            <Link
              key={name}
              href="/login?mode=register"
              style={{
                background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16, padding: '1.25rem 1rem', textDecoration: 'none', color: 'inherit',
                display: 'block', textAlign: 'center', transition: 'border-color .2s',
              }}
              onMouseOver={e => (e.currentTarget.style.borderColor = `rgba(201,168,76,0.3)`)}
              onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: '.5rem' }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{name}</div>
              <div style={{ color: MUTED, fontSize: '.75rem', marginTop: '.25rem' }}>{level}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Value Comparison ─────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '3.5rem 2rem', background: 'rgba(10,12,18,0.7)', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)', backdropFilter: 'blur(12px)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-block', background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20,
            padding: '.25rem .85rem', fontSize: '.72rem', fontWeight: 700,
            color: GOLD, letterSpacing: '.1em', textTransform: 'uppercase',
          }}>
            Why Synaptiq makes sense
          </div>
        </div>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', textAlign: 'center' }}>
          <div style={{ padding: '1.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18 }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '.75rem' }}>👨‍🏫</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>Private A-Level Tutor</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#F87171' }}>£41.59</div>
            <div style={{ color: MUTED, fontSize: '.82rem', marginBottom: '.75rem' }}>average per hour (Tutorful, 2025)</div>
            <div style={{ fontSize: '.78rem', color: 'rgba(136,146,164,0.7)', lineHeight: 1.65 }}>1 hour per week · Fixed schedule · Can&apos;t revisit sessions</div>
          </div>
          <div style={{ padding: '1.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18 }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '.75rem' }}>📚</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>Textbooks + Revision Guides</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: MUTED }}>£40–80</div>
            <div style={{ color: MUTED, fontSize: '.82rem', marginBottom: '.75rem' }}>one-time</div>
            <div style={{ fontSize: '.78rem', color: 'rgba(136,146,164,0.7)', lineHeight: 1.65 }}>Static content · No personalisation · Can&apos;t answer questions</div>
          </div>
          <div style={{ padding: '1.75rem', background: 'rgba(201,168,76,0.07)', border: '1.5px solid rgba(201,168,76,0.3)', borderRadius: 18, position: 'relative', boxShadow: '0 0 40px rgba(201,168,76,0.1), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
            <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg, #D4A820, ${GOLD})`, color: '#0B0F14', fontSize: '.65rem', fontWeight: 800, letterSpacing: '.12em', padding: '.3rem 1rem', borderRadius: 20, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(201,168,76,0.4)' }}>BEST VALUE</div>
            <div style={{ fontSize: '2.2rem', marginBottom: '.75rem' }}>🤖</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>Synaptiq</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, background: `linear-gradient(135deg, ${GOLD}, #F0D080)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>£35</div>
            <div style={{ color: MUTED, fontSize: '.82rem', marginBottom: '.25rem' }}>per month · just £1.17/day</div>
            <div style={{ fontSize: '.72rem', color: 'rgba(74,222,128,0.8)', fontWeight: 600, marginBottom: '.65rem' }}>= the cost of 1 private tutor hour</div>
            <div style={{ fontSize: '.78rem', color: 'rgba(136,146,164,0.7)', lineHeight: 1.65 }}>Unlimited sessions · 24/7 · Personalised to your board</div>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '5rem 2rem', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(1.8rem,3vw,2.6rem)', fontWeight: 900, marginBottom: '.5rem' }}>Simple, transparent pricing</h2>
        <p style={{ color: MUTED, marginBottom: '2.5rem' }}>No hidden fees. Cancel any time. Start with a 7-day free trial.</p>

        {/* Billing toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
          <button
            onClick={() => setIsAnnual(false)}
            style={{
              padding: '.5rem 1.25rem', borderRadius: 20,
              border: '1px solid transparent',
              background: !isAnnual ? 'linear-gradient(135deg,#00D4FF,#7B40FF)' : 'transparent',
              color: !isAnnual ? '#fff' : MUTED,
              fontWeight: 700, fontSize: '.875rem', cursor: 'pointer',
              boxShadow: !isAnnual ? '0 0 18px rgba(0,212,255,0.3)' : 'none',
              transition: 'all .2s',
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            style={{
              padding: '.5rem 1.25rem', borderRadius: 20,
              border: `1px solid rgba(255,255,255,0.08)`,
              background: isAnnual ? 'linear-gradient(135deg,#00D4FF,#7B40FF)' : 'transparent',
              color: isAnnual ? '#fff' : MUTED,
              fontWeight: 600, fontSize: '.875rem', cursor: 'pointer',
              transition: 'all .2s',
            }}
          >
            Annual <span style={{ background: 'rgba(74,222,128,0.15)', color: '#4ADE80', padding: '.1rem .45rem', borderRadius: 10, fontSize: '.75rem', marginLeft: '.3rem' }}>Save 34%</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', maxWidth: 720, margin: '0 auto' }}>
          {/* Student card */}
          <div style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '2rem', position: 'relative', textAlign: 'left' }}>
            <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#00D4FF,#7B40FF)', color: '#fff', fontSize: '.72rem', fontWeight: 800, padding: '.3rem .9rem', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: '.04em', boxShadow: '0 0 18px rgba(0,212,255,0.5)' }}>⭐ MOST POPULAR</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '.5rem' }}>Student Plan</div>
            <div style={{ fontSize: '2.8rem', fontWeight: 900, marginBottom: '.25rem' }}>
              {isAnnual ? '£23' : '£35'}<span style={{ fontSize: '1rem', fontWeight: 400, color: MUTED }}>/month</span>
            </div>
            {isAnnual && <div style={{ color: '#4ADE80', fontSize: '.78rem', fontWeight: 600, marginBottom: '.25rem' }}>Billed annually (£276/yr) — save 34%</div>}            <div style={{ color: MUTED, fontSize: '.82rem', marginBottom: '1.5rem' }}>7-day free trial · Cancel any time</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              {[
                'Full AI Maths Tutor — unlimited questions',
                'Complete A-Level content library',
                'Upload mark schemes & past papers',
                'Unlimited practice questions',
                'Step-by-step mark-scheme working',
                'Flashcards & spaced repetition',
                'All accessibility features',
                'Progress tracking & study streaks',
              ].map(f => (
                <li key={f} style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start', fontSize: '.875rem', color: MUTED }}>
                  <span style={{ color: '#4ADE80', flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link
              href="/login?mode=register"
              style={{
                display: 'block', textAlign: 'center', padding: '.9rem',
                background: `linear-gradient(135deg, ${GOLD}, #8B6914)`,
                color: '#0B0F14', textDecoration: 'none', borderRadius: 12,
                fontWeight: 800, fontSize: '.95rem',
              }}
            >
              Start Free Trial →
            </Link>
            <p style={{ textAlign: 'center', fontSize: '.75rem', color: MUTED, marginTop: '.75rem' }}>
              Card required · Cancel any time · No charge for 7 days
            </p>
          </div>

          {/* Institution card */}
          <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 24, padding: '2rem', textAlign: 'left' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '.5rem' }}>Institution Plan</div>
            <div style={{ fontSize: '2.8rem', fontWeight: 900, marginBottom: '.25rem' }}>Custom</div>
            <div style={{ color: MUTED, fontSize: '.82rem', marginBottom: '1.5rem' }}>Tailored pricing for schools, sixth forms and colleges</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              {[
                'Everything in Student Plan',
                'Whole-class student accounts',
                'Teacher & parent dashboards',
                'Assignment creation & marking',
                'School-wide progress analytics',
                'Dedicated account manager',
                'Invoice billing & PO support',
              ].map(f => (
                <li key={f} style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start', fontSize: '.875rem', color: MUTED }}>
                  <span style={{ color: '#4ADE80', flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a
              href="mailto:schools@synaptiqai.co.uk?subject=School%20Enquiry"
              style={{
                display: 'block', textAlign: 'center', padding: '.9rem',
                background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)',
                color: GOLD, textDecoration: 'none', borderRadius: 12,
                fontWeight: 800, fontSize: '.95rem',
              }}
            >
              Book a Demo →
            </a>
            <p style={{ textAlign: 'center', fontSize: '.75rem', color: MUTED, marginTop: '.75rem' }}>
              From £99/month per class · No setup fees
            </p>
          </div>
        </div>
      </section>

      {/* ── Competitor Comparison ────────────────────────────────────────────── */}
      <section id="compare" style={{ padding: '5rem 2rem', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-block', background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20,
            padding: '.25rem .85rem', fontSize: '.72rem', fontWeight: 700,
            color: GOLD, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1rem',
          }}>See the difference</div>
          <h2 style={{ fontSize: 'clamp(1.8rem,3vw,2.6rem)', fontWeight: 900, marginBottom: '.5rem' }}>How Synaptiq compares</h2>
          <p style={{ color: MUTED }}>The only option combining AI, accessibility, and exam-board alignment in one product</p>
        </div>
        <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid rgba(201,168,76,0.15)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9rem', minWidth: 560 }}>
            <thead>
              <tr style={{ background: 'rgba(201,168,76,0.06)' }}>
                <th style={{ textAlign: 'left', padding: '.9rem 1.25rem', color: MUTED, fontWeight: 600, borderBottom: '1px solid rgba(201,168,76,0.2)' }}>Feature</th>
                <th style={{ padding: '.9rem 1rem', color: GOLD, fontWeight: 800, borderBottom: '1px solid rgba(201,168,76,0.2)' }}>Synaptiq</th>
                <th style={{ padding: '.9rem 1rem', color: MUTED, fontWeight: 600, borderBottom: '1px solid rgba(201,168,76,0.2)' }}>Save My Exams</th>
                <th style={{ padding: '.9rem 1rem', color: MUTED, fontWeight: 600, borderBottom: '1px solid rgba(201,168,76,0.2)' }}>ChatGPT</th>
                <th style={{ padding: '.9rem 1rem', color: MUTED, fontWeight: 600, borderBottom: '1px solid rgba(201,168,76,0.2)' }}>Private Tutor</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: 'Mark-scheme aligned answers', cols: ['✓', '✓', '✗', '✓'] },
                { feature: 'AI chat tutor (available 24/7)', cols: ['✓', '✗', '✓', '✗'] },
                { feature: 'ADHD / Dyslexia / Dyscalculia modes', cols: ['✓', '✗', '✗', '~'] },
                { feature: 'Spaced-repetition flashcards', cols: ['✓', '✗', '✗', '✗'] },
                { feature: 'Progress tracking & XP system', cols: ['✓', '✗', '✗', '✗'] },
                { feature: 'Price per month', cols: ['£35', '£7.99', '£20+', '£40–80/hr'], isPriceRow: true },
              ].map(({ feature, cols, isPriceRow }, ri) => (
                <tr key={feature} style={{ borderBottom: ri < 5 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                  <td style={{ padding: '.8rem 1.25rem', fontWeight: isPriceRow ? 700 : 400 }}>{feature}</td>
                  {cols.map((v, ci) => (
                    <td key={ci} style={{
                      textAlign: 'center',
                      color: isPriceRow
                        ? (ci === 0 ? GOLD : MUTED)
                        : (v === '✓' ? '#4ADE80' : v === '✗' ? '#F87171' : '#FBBF24'),
                      fontWeight: isPriceRow && ci === 0 ? 800 : undefined,
                      fontSize: isPriceRow ? undefined : '1.1rem',
                    }}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section id="faq" style={{ position: 'relative', zIndex: 1, padding: '5rem 2rem', background: 'rgba(10,12,18,0.5)' }}>
        <h2 style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', textAlign: 'center', fontWeight: 900, marginBottom: '.75rem' }}>
          Frequently asked questions
        </h2>
        <p style={{ textAlign: 'center', color: MUTED, marginBottom: '3rem' }}>
          Everything you need to know before starting your free trial.
        </p>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {FAQ_ITEMS.map(({ q, a }) => (
            <details
              key={q}
              style={{
                background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14, overflow: 'hidden',
              }}
            >
              <summary
                style={{
                  padding: '1.1rem 1.25rem', cursor: 'pointer', fontWeight: 600,
                  fontSize: '.95rem', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                {q}
                <span style={{ color: GOLD, flexShrink: 0, marginLeft: '1rem' }}>+</span>
              </summary>
              <p style={{ padding: '0 1.25rem 1.1rem', color: MUTED, fontSize: '.9rem', lineHeight: 1.7, margin: 0 }}>
                {a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 2rem', textAlign: 'center', background: 'linear-gradient(180deg, rgba(10,12,18,0.5) 0%, rgba(201,168,76,0.04) 100%)' }}>
        <div style={{
          display: 'inline-block', background: 'rgba(201,168,76,0.1)',
          border: '1px solid rgba(201,168,76,0.25)', borderRadius: 20,
          padding: '.3rem .9rem', fontSize: '.75rem', fontWeight: 700,
          color: GOLD, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1.25rem',
        }}>
          🎓 Free trial — no charge for 7 days
        </div>
        <h2 style={{ fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 900, marginBottom: '1rem', lineHeight: 1.2 }}>
          Stop losing marks.<br />
          <span style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #F0D080 50%, ${GOLD} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Start understanding the method.
          </span>
        </h2>
        <p style={{ color: MUTED, maxWidth: 520, margin: '0 auto 2rem', lineHeight: 1.7 }}>
          2,400+ students have already improved by an average of +2 grades. The free trial takes 30 seconds to start.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <Link
            href="/login"
            style={{
              padding: '.9rem 2.25rem', borderRadius: 12,
              background: `linear-gradient(135deg, ${GOLD}, #8B6914)`,
              color: '#0B0F14', textDecoration: 'none',
              fontSize: '1rem', fontWeight: 800,
              boxShadow: '0 8px 32px rgba(201,168,76,0.3)',
            }}
          >
            Start Your Free Trial →
          </Link>
          <a
            href="mailto:schools@synaptiqai.co.uk?subject=School%20Enquiry"
            style={{
              padding: '.9rem 2.25rem', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: '#E6EDF3', textDecoration: 'none',
              fontSize: '1rem', fontWeight: 600,
            }}
          >
            Schools — Book a Demo
          </a>
        </div>
        <p style={{ color: MUTED, fontSize: '.8rem' }}>£35/month after trial · Cancel any time · AQA · Edexcel · OCR · WJEC</p>
      </section>

      {/* ── Page Footer ──────────────────────────────────────────────────────── */}
      <footer style={{ background: 'rgba(10,12,18,0.97)', borderTop: '1px solid rgba(201,168,76,0.1)', padding: '4rem 2rem 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
            {/* Brand */}
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: '.75rem' }}>
                Synapti<span style={{ color: GOLD }}>q</span>
              </div>
              <p style={{ color: MUTED, fontSize: '.875rem', lineHeight: 1.7, maxWidth: 280, marginBottom: '1.25rem' }}>
                The UK&apos;s most focused A-Level Maths AI tutor. Step-by-step working, mark-scheme-aligned answers, and personalised revision for every exam board.
              </p>
              <div style={{ display: 'flex', gap: '.75rem' }}>
                {[
                  { href: 'https://twitter.com/synaptiqai', label: 'Twitter/X', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> },
                  { href: 'https://instagram.com/synaptiqai', label: 'Instagram', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg> },
                  { href: 'https://tiktok.com/@synaptiqai', label: 'TikTok', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z" /></svg> },
                ].map(({ href, label, svg }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'rgba(12,14,20,0.82)', backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: MUTED, textDecoration: 'none', transition: '.15s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = MUTED }}
                  >
                    {svg}
                  </a>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: MUTED, marginBottom: '1.25rem' }}>Product</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {[
                  { href: '#features', label: 'Features' },
                  { href: '#pricing', label: 'Pricing' },
                  { href: '/login', label: 'Log In' },
                  { href: '/login?mode=register', label: 'Sign Up Free' },
                ].map(({ href, label }) => (
                  <a key={label} href={href} style={{ color: MUTED, fontSize: '.875rem', textDecoration: 'none', transition: '.15s' }}
                    onMouseOver={e => (e.currentTarget.style.color = '#E6EDF3')}
                    onMouseOut={e => (e.currentTarget.style.color = MUTED)}>
                    {label}
                  </a>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div>
              <h4 style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: MUTED, marginBottom: '1.25rem' }}>Resources</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {[
                  { href: '#features', label: 'A-Level Maths Guide' },
                  { href: '#compare', label: 'Exam Board Comparison' },
                  { href: '#faq', label: 'Revision Tips & FAQ' },
                  { href: 'mailto:schools@synaptiqai.co.uk', label: 'Schools & Tutors' },
                ].map(({ href, label }) => (
                  <a key={label} href={href} style={{ color: MUTED, fontSize: '.875rem', textDecoration: 'none', transition: '.15s' }}
                    onMouseOver={e => (e.currentTarget.style.color = '#E6EDF3')}
                    onMouseOut={e => (e.currentTarget.style.color = MUTED)}>
                    {label}
                  </a>
                ))}
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: MUTED, marginBottom: '1.25rem' }}>Company</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {[
                  { href: '/privacy', label: 'Privacy Policy' },
                  { href: '/terms', label: 'Terms of Service' },
                  { href: '/cookies', label: 'Cookie Policy' },
                  { href: 'mailto:hello@synaptiqai.co.uk', label: 'Contact Us' },
                ].map(({ href, label }) => (
                  <a key={label} href={href} style={{ color: MUTED, fontSize: '.875rem', textDecoration: 'none', transition: '.15s' }}
                    onMouseOver={e => (e.currentTarget.style.color = '#E6EDF3')}
                    onMouseOut={e => (e.currentTarget.style.color = MUTED)}>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ color: MUTED, fontSize: '.75rem' }}>© 2025 Synaptiq Ltd. All rights reserved.</p>
              <p style={{ color: MUTED, fontSize: '.7rem', marginTop: '.2rem' }}>Registered in England &amp; Wales · hello@synaptiqai.co.uk</p>
            </div>
            <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {['AQA', 'Edexcel', 'OCR', 'WJEC'].map(b => (
                <span key={b} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20, padding: '.2rem .7rem', fontSize: '.7rem', color: GOLD }}>{b}</span>
              ))}
              <span style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '.2rem .7rem', fontSize: '.7rem', color: '#4ADE80' }}>GDPR Compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
