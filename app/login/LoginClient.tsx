'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Eye, EyeOff, ArrowRight, Loader2,
  BookOpen, Brain, Trophy, CheckCircle2,
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'

type Mode = 'login' | 'register'

const features = [
  { icon: Brain,       text: 'AI-powered A-Level tutoring, available 24/7'     },
  { icon: BookOpen,    text: 'Full curriculum: Pure, Stats & Mechanics'         },
  { icon: Trophy,      text: 'Track XP, streaks and leaderboard rankings'       },
  { icon: CheckCircle2, text: 'Past papers, worked solutions & exam simulations' },
]

export default function LoginClient({ initialMode = 'login' }: { initialMode?: Mode }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    const supabase = createBrowserClient()
    if (!supabase) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
  }, [router])

  useEffect(() => { setMode(initialMode) }, [initialMode])

  function handleModeChange(nextMode: Mode) {
    setMode(nextMode)
    setError(null)
    setSuccess(null)
    router.replace(nextMode === 'register' ? '/login?mode=register' : '/login')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const supabase = createBrowserClient()
    if (!supabase) {
      setError('Auth service not configured.')
      setLoading(false)
      return
    }

    if (mode === 'login') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })
      if (signInError) {
        if (/email not confirmed/i.test(signInError.message)) {
          setError('Please verify your email address before signing in. Check your inbox for a confirmation link.')
        } else if (/invalid login credentials|invalid email or password/i.test(signInError.message)) {
          setError('Incorrect email or password. Please try again.')
        } else {
          setError(signInError.message)
        }
      } else {
        router.replace('/dashboard')
      }
    } else {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', email, password, name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Registration failed.')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password,
        })
        if (signInError) {
          setSuccess('Account created! Please sign in to Synaptiq.')
          setMode('login')
          router.replace('/login')
        } else {
          router.replace('/dashboard')
        }
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#03050D' }}>

      {/* ─── Left brand panel (hidden on mobile) ─── */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #070B18 0%, #0A1020 60%, #0D1428 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-[-120px] left-[-80px] w-[420px] h-[420px] rounded-full opacity-[0.07]"
             style={{ background: 'radial-gradient(circle, #C9A84C, transparent 70%)' }} />
        <div className="absolute bottom-[-100px] right-[-60px] w-[360px] h-[360px] rounded-full opacity-[0.05]"
             style={{ background: 'radial-gradient(circle, #00D4FF, transparent 70%)' }} />
        <div className="absolute top-[38%] right-[-120px] w-[300px] h-[300px] rounded-full opacity-[0.04]"
             style={{ background: 'radial-gradient(circle, #C9A84C, transparent 70%)' }} />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #C9A84C, #D4B86A)', boxShadow: '0 8px 24px rgba(201,168,76,0.3)' }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-[18px] text-white tracking-tight leading-none">Synaptiq</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#5A7499' }}>A-Level Maths AI</p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] mb-4"
               style={{ color: '#C9A84C' }}>
              Your A-Level Maths companion
            </p>
            <h2 className="text-[36px] font-bold text-white leading-[1.15] mb-4">
              Master A-Level Maths<br />
              <span style={{ color: '#C9A84C' }}>with AI by your side.</span>
            </h2>
            <p className="text-[15px] leading-relaxed max-w-sm" style={{ color: '#5A7499' }}>
              Synaptiq gives you an intelligent tutor that adapts to your gaps, tracks your
              progress and preps you for exam day — available whenever you need it.
            </p>
          </motion.div>

          {/* Feature list */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 space-y-3"
          >
            {features.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                     style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
                </div>
                <p className="text-[13px]" style={{ color: '#8AABB0' }}>{text}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Testimonial */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative z-10 rounded-2xl px-5 py-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[13px] leading-relaxed italic" style={{ color: '#7A9AB0' }}>
            &ldquo;I went from a predicted C to an A* after a month on Synaptiq. The AI actually
            explains <em>why</em> my working is wrong — not just that it is.&rdquo;
          </p>
          <div className="flex items-center gap-2.5 mt-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                 style={{ background: 'linear-gradient(135deg, #C9A84C, #00D4FF)' }}>
              J
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white leading-none">Jamie T.</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#5A7499' }}>A-Level student, 2025</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ─── Right form panel ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">

        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #C9A84C, #D4B86A)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <p className="font-bold text-[17px] text-white tracking-tight">Synaptiq</p>
        </div>

        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px]"
        >
          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-[26px] font-bold text-white leading-tight">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-[14px] mt-1.5" style={{ color: '#5A7499' }}>
              {mode === 'login'
                ? 'Sign in to open your Synaptiq dashboard'
                : 'Start your A-Level Maths journey today'}
            </p>
          </div>

          {/* Mode toggle pills */}
          <div className="flex rounded-xl p-1 mb-7"
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => handleModeChange(m)}
                className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200"
                style={mode === m
                  ? { background: 'linear-gradient(135deg, #C9A84C, #D4B86A)', color: '#03050D' }
                  : { color: '#5A7499' }
                }
              >
                {m === 'login' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          {/* Alerts */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-5 px-4 py-3 rounded-xl text-[13px]"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-5 px-4 py-3 rounded-xl text-[13px]"
                style={{ background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.2)', color: '#00FF9D' }}
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#8AABB0' }}>
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-xl text-[14px] text-white placeholder:opacity-30 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)')}
                  onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>
            )}

            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#8AABB0' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-xl text-[14px] text-white placeholder:opacity-30 outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-semibold" style={{ color: '#8AABB0' }}>
                  Password
                </label>
                {mode === 'login' && (
                  <Link href="/reset-password"
                    className="text-[12px] transition-colors"
                    style={{ color: '#C9A84C' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
                  required
                  minLength={mode === 'register' ? 8 : undefined}
                  className="w-full px-4 py-3 pr-12 rounded-xl text-[14px] text-white placeholder:opacity-30 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)')}
                  onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity"
                  style={{ color: '#5A7499' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#5A7499')}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.015 }}
              whileTap={{ scale: loading ? 1 : 0.985 }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold transition-all disabled:opacity-60 mt-1"
              style={{
                background: 'linear-gradient(135deg, #C9A84C, #D4B86A)',
                color: '#03050D',
                boxShadow: '0 8px 28px rgba(201,168,76,0.25)',
              }}
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : mode === 'login'
                  ? <><span>Sign in to Synaptiq</span><ArrowRight className="w-4 h-4" /></>
                  : <><span>Create my account</span><ArrowRight className="w-4 h-4" /></>
              }
            </motion.button>
          </form>

          {/* Terms for register */}
          {mode === 'register' && (
            <p className="text-center text-[12px] mt-4" style={{ color: '#3D5470' }}>
              By signing up you agree to our{' '}
              <Link href="/terms" className="underline" style={{ color: '#5A7499' }}>Terms</Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline" style={{ color: '#5A7499' }}>Privacy Policy</Link>.
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
