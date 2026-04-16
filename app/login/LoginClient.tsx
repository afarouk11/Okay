'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Loader2, Zap } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'

type Mode = 'login' | 'register'

const stats = [
  { value: '40+',  label: 'Topics covered'     },
  { value: '97%',  label: 'Pass rate reported'  },
  { value: '24/7', label: 'AI tutor access'     },
]

export default function LoginClient({ initialMode = 'login' }: { initialMode?: Mode }) {
  const router = useRouter()
  const [mode, setMode]             = useState<Mode>(initialMode)
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [name, setName]             = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState<string | null>(null)

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
          setError('Please verify your email before signing in.')
        } else if (/invalid login credentials|invalid email or password/i.test(signInError.message)) {
          setError('Incorrect email or password.')
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
          setSuccess('Account created! Please sign in.')
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
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: '#07091A' }}>

      {/* ── LEFT: brand / hero panel ── */}
      <div className="relative hidden lg:flex lg:w-[55%] flex-col justify-between px-16 py-14 overflow-hidden"
           style={{ background: '#07091A', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Background gradient orb */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-200px] left-[-200px] w-[700px] h-[700px] rounded-full"
               style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 65%)' }} />
          <div className="absolute bottom-[-100px] right-[-150px] w-[500px] h-[500px] rounded-full"
               style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 65%)' }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #C9A84C, #D4B86A)' }}>
            <Zap className="w-4.5 h-4.5 text-[#07091A]" strokeWidth={2.5} />
          </div>
          <span className="text-white font-bold text-[17px] tracking-tight">Synaptiq</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-6"
               style={{ color: '#C9A84C' }}>
              A-Level Maths AI Platform
            </p>
            <h1 className="text-[52px] font-extrabold text-white leading-[1.05] tracking-tight mb-6">
              Improve your<br />
              <span style={{
                background: 'linear-gradient(90deg, #C9A84C, #E8CC7A)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                A-Level Maths
              </span><br />
              grades.
            </h1>
            <p className="text-[17px] leading-relaxed max-w-[420px]" style={{ color: '#6B8BB5' }}>
              Synaptiq combines AI tutoring, past papers and personalised
              practice to get you from where you are to the grade you want.
            </p>
          </motion.div>

          {/* Stats row — Uplearn style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-0 mt-14"
          >
            {stats.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col"
                   style={{ borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)', paddingLeft: i === 0 ? 0 : 32, marginLeft: i === 0 ? 0 : 0 }}>
                <span className="text-[38px] font-extrabold leading-none"
                      style={{ color: '#C9A84C' }}>{s.value}</span>
                <span className="text-[12px] mt-1.5 uppercase tracking-[0.1em]"
                      style={{ color: '#4A6585' }}>{s.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="relative z-10"
        >
          <p className="text-[14px] leading-relaxed" style={{ color: '#3D5470' }}>
            &ldquo;Going from a predicted D to an A* — Synaptiq actually explains{' '}
            <span style={{ color: '#5A7499' }}>why</span> you&apos;re wrong, not just that you are.&rdquo;
          </p>
          <p className="text-[12px] mt-2 font-semibold" style={{ color: '#2D3E55' }}>— Jamie T., A-Level student</p>
        </motion.div>
      </div>

      {/* ── RIGHT: form panel ── */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-20 py-16"
           style={{ background: '#07091A' }}>

        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-3 mb-12">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #C9A84C, #D4B86A)' }}>
            <Zap className="w-4 h-4 text-[#07091A]" strokeWidth={2.5} />
          </div>
          <span className="text-white font-bold text-[16px] tracking-tight">Synaptiq</span>
        </div>

        <div className="w-full max-w-[420px]">

          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode + '-heading'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="mb-10"
            >
              <h2 className="text-[32px] font-extrabold text-white tracking-tight leading-tight">
                {mode === 'login' ? 'Welcome back.' : 'Get started free.'}
              </h2>
              <p className="text-[14px] mt-2" style={{ color: '#4A6585' }}>
                {mode === 'login'
                  ? 'Sign in to your Synaptiq account.'
                  : 'Create your account in seconds.'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Tab switcher */}
          <div className="flex mb-8 rounded-xl overflow-hidden"
               style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
            {(['login', 'register'] as Mode[]).map(m => (
              <button key={m} type="button" onClick={() => handleModeChange(m)}
                className="flex-1 py-2.5 text-[13px] font-bold uppercase tracking-[0.08em] transition-all duration-200"
                style={mode === m
                  ? { background: '#C9A84C', color: '#07091A' }
                  : { color: '#3D5470' }}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Alerts */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-6 px-4 py-3 rounded-lg text-[13px]"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171' }}>
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-6 px-4 py-3 rounded-lg text-[13px]"
                style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.18)', color: '#4ade80' }}>
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.12em] mb-2"
                       style={{ color: '#4A6585' }}>Full Name</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name" required
                  className="w-full px-4 py-3.5 rounded-xl text-[14px] text-white outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', caretColor: '#C9A84C' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)')}
                  onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.12em] mb-2"
                     style={{ color: '#4A6585' }}>Email Address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="w-full px-4 py-3.5 rounded-xl text-[14px] text-white outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', caretColor: '#C9A84C' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase tracking-[0.12em]"
                       style={{ color: '#4A6585' }}>Password</label>
                {mode === 'login' && (
                  <Link href="/reset-password" className="text-[12px] font-medium transition-opacity hover:opacity-70"
                        style={{ color: '#C9A84C' }}>
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
                  required minLength={mode === 'register' ? 8 : undefined}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl text-[14px] text-white outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', caretColor: '#C9A84C' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)')}
                  onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#3D5470' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#3D5470')}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-[14px] font-bold uppercase tracking-[0.08em] transition-all disabled:opacity-50 mt-2"
              style={{ background: '#C9A84C', color: '#07091A' }}
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <>
                    <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
              }
            </motion.button>
          </form>

          {mode === 'register' && (
            <p className="text-[12px] text-center mt-5" style={{ color: '#2D3E55' }}>
              By signing up you agree to our{' '}
              <Link href="/terms" style={{ color: '#4A6585' }} className="underline">Terms</Link>{' '}
              and{' '}
              <Link href="/privacy" style={{ color: '#4A6585' }} className="underline">Privacy Policy</Link>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
