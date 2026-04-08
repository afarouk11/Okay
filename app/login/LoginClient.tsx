'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'

type Mode = 'login' | 'register'

export default function LoginClient({ initialMode = 'login' }: { initialMode?: Mode }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    const supabase = createBrowserClient()
    if (!supabase) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
  }, [router])

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.message)
      } else {
        router.replace('/dashboard')
      }
    } else {
      // Register via API route (creates profile row)
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', email, password, name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Registration failed.')
      } else {
        // Sign in immediately after registration
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
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
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#03050D' }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
            style={{ background: 'linear-gradient(135deg, #D4A820, #C9A84C)', boxShadow: '0 8px 24px rgba(201,168,76,0.25)' }}
          >
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-lg text-foreground tracking-tight">Synaptiq</p>
            <p className="text-xs text-muted">Home of your AI tutor</p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-card p-6"
          style={{ background: 'rgba(13,18,32,0.88)', border: '1px solid rgba(0,212,255,0.12)', boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}
        >
          <h1 className="text-xl font-semibold text-foreground mb-1">
            {mode === 'login' ? 'Welcome back to Synaptiq' : 'Create your Synaptiq account'}
          </h1>
          <p className="text-sm text-muted mb-6">
            {mode === 'login'
              ? 'Sign in to open your Synaptiq dashboard'
              : 'Start your A-Level Maths journey with Synaptiq'}
          </p>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 px-4 py-3 rounded-lg text-sm"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 px-4 py-3 rounded-lg text-sm"
                style={{ background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.2)', color: '#00FF9D' }}
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3.5 py-2.5 rounded-[10px] text-sm text-foreground placeholder:text-muted/50 outline-none transition-colors"
                  style={{
                    background: 'rgba(3,5,13,0.55)',
                    border: '1px solid rgba(0,212,255,0.12)',
                  }}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3.5 py-2.5 rounded-[10px] text-sm text-foreground placeholder:text-muted/50 outline-none transition-colors"
                style={{
                  background: 'rgba(3,5,13,0.55)',
                  border: '1px solid rgba(0,212,255,0.12)',
                }}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
                  required
                  minLength={mode === 'register' ? 8 : undefined}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-[10px] text-sm text-foreground placeholder:text-muted/50 outline-none transition-colors"
                  style={{
                    background: 'rgba(3,5,13,0.55)',
                    border: '1px solid rgba(0,212,255,0.12)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'login' && (
                <div className="mt-2 text-right">
                  <Link href="/reset-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                </div>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-medium text-white transition-all disabled:opacity-60 mt-2"
              style={{ background: 'linear-gradient(135deg, #D4A820, #C9A84C)', color: '#03050D', boxShadow: '0 8px 24px rgba(201,168,76,0.22)' }}
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : mode === 'login'
                  ? <><span>Sign in</span><ArrowRight className="w-4 h-4" /></>
                  : <><span>Create account</span><ArrowRight className="w-4 h-4" /></>
              }
            </motion.button>
          </form>

          <p className="text-center text-sm text-muted mt-5">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => handleModeChange(mode === 'login' ? 'register' : 'login')}
              className="text-primary hover:underline font-medium"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
