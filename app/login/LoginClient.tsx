'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, Zap } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'

type Mode = 'login' | 'register'

export default function LoginClient({ initialMode = 'login' }: { initialMode?: Mode }) {
  const router = useRouter()
  const [mode, setMode]                     = useState<Mode>(initialMode)
  const [email, setEmail]                   = useState('')
  const [password, setPassword]             = useState('')
  const [name, setName]                     = useState('')
  const [showPassword, setShowPassword]     = useState(false)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [success, setSuccess]               = useState<string | null>(null)

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
    if (!supabase) { setError('Auth service not configured.'); setLoading(false); return }

    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(), password,
      })
      if (err) {
        setError(/email not confirmed/i.test(err.message)
          ? 'Please verify your email before signing in.'
          : /invalid login credentials|invalid email or password/i.test(err.message)
          ? 'Incorrect email or password.'
          : err.message)
      } else {
        router.replace('/dashboard')
      }
    } else {
      const res  = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', email, password, name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Registration failed.')
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(), password,
        })
        if (err) { setSuccess('Account created! Please sign in.'); setMode('login'); router.replace('/login') }
        else router.replace('/dashboard')
      }
    }
    setLoading(false)
  }

  const INPUT_STYLE: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 10, fontSize: 15,
    border: '1.5px solid rgba(255,255,255,0.08)', outline: 'none',
    color: '#E6EDF3', background: 'rgba(255,255,255,0.04)',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03050D' }}>

      {/* ── LEFT decorative panel ── */}
      <div style={{
        width: '45%', minHeight: '100vh', background: '#06091A',
        position: 'relative', overflow: 'hidden',
      }} className="hidden md:flex flex-col items-center justify-center">

        {/* Radial glow */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Layered arch shapes */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          {[900, 720, 540, 360].map((w, i) => (
            <div key={w} style={{
              position: 'absolute', bottom: -120, left: '50%', transform: 'translateX(-50%)',
              width: w, height: w, borderRadius: '50% 50% 0 0',
              border: `1px solid rgba(201,168,76,${0.06 + i * 0.03})`,
              background: `rgba(20,${25 + i * 5},${60 + i * 5},${0.3 + i * 0.1})`,
            }} />
          ))}
          <div style={{
            position: 'absolute', bottom: -120, left: '50%', transform: 'translateX(-50%)',
            width: 210, height: 210, borderRadius: '50% 50% 0 0',
            background: 'linear-gradient(180deg, #C9A84C 0%, #8A6F28 100%)', opacity: 0.85,
          }} />
        </div>

        {/* Floating math symbols */}
        {[
          { symbol: 'π', top: '12%', left: '15%', size: 28, opacity: 0.18 },
          { symbol: '∫', top: '20%', right: '18%', size: 36, opacity: 0.14 },
          { symbol: 'Σ', top: '55%', left: '10%', size: 24, opacity: 0.12 },
          { symbol: '√', top: '38%', right: '12%', size: 22, opacity: 0.15 },
          { symbol: 'θ', top: '70%', left: '22%', size: 20, opacity: 0.10 },
          { symbol: '∞', top: '65%', right: '20%', size: 26, opacity: 0.12 },
        ].map((s, i) => (
          <div key={i} style={{
            position: 'absolute', top: s.top,
            left: (s as { left?: string }).left, right: (s as { right?: string }).right,
            fontSize: s.size, fontWeight: 700, color: '#C9A84C', opacity: s.opacity,
            fontFamily: 'serif', userSelect: 'none',
          }}>{s.symbol}</div>
        ))}

        {/* Branding */}
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', paddingBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #C9A84C, #D4B86A)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 12px 40px rgba(201,168,76,0.4)' }}>
            <Zap style={{ width: 26, height: 26, color: '#07091A' }} strokeWidth={2.5} />
          </div>
          <p style={{ color: '#E6EDF3', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em', margin: 0 }}>Synapnode</p>
          <p style={{ color: 'rgba(201,168,76,0.55)', fontSize: 11, marginTop: 7, letterSpacing: '0.14em', textTransform: 'uppercase' }}>A-Level Maths AI</p>
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 240 }}>
            {['Step-by-step mark-scheme working','Tracks your weak topics','24/7 — less than one tutor hour/month'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(201,168,76,0.7)', fontSize: 12 }}>
                <span style={{ color: '#C9A84C', fontSize: 14 }}>✓</span>{f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT form panel — dark themed ── */}
      <div style={{ flex: 1, minHeight: '100vh', background: '#050810', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>

        {/* Mobile logo */}
        <div className="flex md:hidden items-center gap-2.5 mb-10">
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #C9A84C, #D4B86A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap style={{ width: 16, height: 16, color: '#07091A' }} strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: '#E6EDF3', letterSpacing: '-0.02em' }}>Synapnode</span>
        </div>

        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div key={mode + '-h'}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{ marginBottom: 32, textAlign: 'center' }}
            >
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#E6EDF3', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p style={{ fontSize: 14, color: '#5A7499', margin: 0, lineHeight: 1.5 }}>
                {mode === 'login' ? 'Sign in to continue your A-Level revision' : 'Start your free 7-day trial today'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Alerts */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, fontSize: 13,
                  background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#F87171' }}>
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, fontSize: 13,
                  background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ADE80' }}>
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Full name" required style={INPUT_STYLE}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            )}

            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email address" required style={INPUT_STYLE}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />

            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Password" required minLength={mode === 'register' ? 8 : undefined}
                style={{ ...INPUT_STYLE, padding: '14px 44px 14px 16px' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#5A7499', padding: 0 }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
              </button>
            </div>

            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: -4 }}>
                <Link href="/reset-password" style={{ fontSize: 13, color: '#C9A84C', textDecoration: 'none', fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </div>
            )}

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01, boxShadow: loading ? 'none' : '0 8px 24px rgba(201,168,76,0.35)' }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              style={{ width: '100%', padding: '15px 0', borderRadius: 10, fontSize: 15, fontWeight: 700,
                background: 'linear-gradient(135deg, #C9A84C, #8B6914)', color: '#050810', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, opacity: loading ? 0.65 : 1, marginTop: 4 }}
            >
              {loading
                ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
                : mode === 'login' ? 'Sign in' : 'Create account — free 7-day trial'
              }
            </motion.button>
          </form>

          {/* Switch mode */}
          <p style={{ textAlign: 'center', fontSize: 14, color: '#5A7499', marginTop: 24 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => handleModeChange(mode === 'login' ? 'register' : 'login')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C9A84C', fontWeight: 700, fontSize: 14, padding: 0 }}>
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>

          {mode === 'register' && (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#3D5470', marginTop: 16 }}>
              By signing up you agree to our{' '}
              <Link href="/terms" style={{ color: '#5A7499', textDecoration: 'underline' }}>Terms</Link> and{' '}
              <Link href="/privacy" style={{ color: '#5A7499', textDecoration: 'underline' }}>Privacy Policy</Link>.
              No charge for 7 days.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
