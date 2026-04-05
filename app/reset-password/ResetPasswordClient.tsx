'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Zap, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'

type Status = 'idle' | 'loading' | 'success' | 'error' | 'invalid'

export default function ResetPasswordClient() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  // Exchange the recovery token from the URL hash for a session
  useEffect(() => {
    const supabase = createBrowserClient()
    if (!supabase) { setStatus('invalid'); return }

    // Supabase sets the session automatically from the URL hash on load
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Also check if there's already a session (e.g., page reload)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.')
      return
    }

    const supabase = createBrowserClient()
    if (!supabase) { setStatus('invalid'); return }

    setStatus('loading')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErrorMsg(error.message)
      setStatus('error')
    } else {
      setStatus('success')
      setTimeout(() => router.replace('/dashboard'), 2500)
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0B0F14' }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <CheckCircle className="w-12 h-12 mx-auto" style={{ color: '#22C55E' }} />
          <h2 className="text-xl font-bold" style={{ color: '#F0EEF8' }}>Password updated!</h2>
          <p className="text-sm" style={{ color: '#9AA4AF' }}>Redirecting you to your dashboard…</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0B0F14' }}>
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg,#4F8CFF,#22C55E)' }}>
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: '#F0EEF8' }}>Set a new password</h1>
          <p className="text-sm mt-1.5 text-center" style={{ color: '#9AA4AF' }}>
            Enter your new password below. It must be at least 8 characters.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {!sessionReady && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Waiting for password-reset link… If you came here directly, please use the reset link from your email.</span>
            </div>
          )}

          {(status === 'error' || errorMsg) && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg || 'An error occurred. Please try again.'}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#9AA4AF' }}>New password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#F0EEF8',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#9AA4AF' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#9AA4AF' }}>Confirm password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={8}
                placeholder="Repeat your new password"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#F0EEF8',
                }}
              />
            </div>

            <motion.button
              type="submit"
              disabled={status === 'loading' || !sessionReady}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
              style={{
                background: 'linear-gradient(135deg,#4F8CFF,#22C55E)',
                color: '#fff',
                opacity: (status === 'loading' || !sessionReady) ? 0.6 : 1,
              }}
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
              ) : (
                'Update password'
              )}
            </motion.button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: '#6B7394' }}>
          <Link href="/login" className="hover:text-white transition-colors">← Back to Synaptiq</Link>
        </p>
      </motion.div>
    </div>
  )
}
