'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem('synaptiq_consent')) setVisible(true)
    } catch {
      // localStorage unavailable (SSR, private browsing) — don't show
    }
  }, [])

  function accept() {
    try { localStorage.setItem('synaptiq_consent', 'accepted') } catch {}
    setVisible(false)
  }

  function decline() {
    try { localStorage.setItem('synaptiq_consent', 'essential') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 flex justify-center"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div
        className="w-full max-w-2xl rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{
          background: 'rgba(13,18,32,0.97)',
          border: '1px solid rgba(201,168,76,0.2)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
      >
        <p className="flex-1 text-sm" style={{ color: '#9AA4AF' }}>
          We use essential cookies to keep you logged in, and optional analytics cookies to improve the platform.{' '}
          <Link href="/cookies" className="underline hover:text-white transition-colors" style={{ color: '#C9A84C' }}>
            Cookie policy
          </Link>
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#9AA4AF', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Essential only
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: '#C9A84C', color: '#08090E' }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
