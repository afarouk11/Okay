'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

export default function ResetPasswordClient() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [hasToken, setHasToken] = useState(false)

  // Supabase embeds the recovery token in the URL hash. We must exchange it
  // via onAuthStateChange before we can call updateUser.
  useEffect(() => {
    const supabase = createBrowserClient()
    if (!supabase) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setHasToken(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setStatus('error')
      setMessage('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setStatus('error')
      setMessage('Passwords do not match.')
      return
    }

    setStatus('loading')
    setMessage('')

    const supabase = createBrowserClient()
    if (!supabase) {
      setStatus('error')
      setMessage('Password reset is unavailable. Please contact support.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setStatus('error')
      setMessage(error.message)
    } else {
      setStatus('success')
      setMessage('Password updated! Redirecting to login…')
      setTimeout(() => router.replace('/login'), 2500)
    }
  }

  return (
    <div style={{
      background: '#03050D', color: '#F0EEF8', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      fontFamily: '\'DM Sans\', system-ui, sans-serif',
    }}>
      <div style={{
        background: 'rgba(10,12,18,0.97)', border: '1px solid rgba(201,168,76,0.3)',
        borderRadius: 20, padding: '2.5rem 2rem', width: '100%', maxWidth: 420,
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>
        <Link href="/" style={{ display: 'block', textAlign: 'center', fontSize: '1.6rem', fontWeight: 900, color: '#C9A84C', textDecoration: 'none', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
          Synaptiq
        </Link>

        {!hasToken ? (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Check your email</h1>
            <p style={{ color: '#6B7394', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Open the password reset link in your email to continue. This page will update automatically.
            </p>
            <Link href="/login" style={{ color: '#C9A84C', fontSize: '0.875rem', textDecoration: 'none' }}>
              ← Back to login
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>Set new password</h1>
            <p style={{ color: '#6B7394', fontSize: '0.88rem', marginBottom: '1.5rem' }}>Choose a strong password for your account.</p>

            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#94A3B8', marginBottom: '0.35rem' }}>New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                style={inputStyle}
              />

              <label style={{ display: 'block', fontSize: '0.82rem', color: '#94A3B8', marginBottom: '0.35rem' }}>Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
                style={inputStyle}
              />

              {message && (
                <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: status === 'error' ? '#FB7185' : '#4ADE80' }}>
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                style={{
                  width: '100%', background: 'linear-gradient(135deg, #C9A84C, #A07830)',
                  color: '#08090E', border: 'none', borderRadius: 12, padding: '0.85rem',
                  fontSize: '1rem', fontWeight: 700, cursor: status === 'loading' ? 'wait' : 'pointer',
                  opacity: status === 'loading' ? 0.7 : 1,
                }}
              >
                {status === 'loading' ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
  padding: '0.75rem 1rem', color: '#F0EEF8', fontSize: '0.95rem',
  outline: 'none', marginBottom: '1rem', boxSizing: 'border-box',
}
