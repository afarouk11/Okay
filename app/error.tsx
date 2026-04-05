'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('[App Error]', error)
  }, [error])

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#0B0F14' }}
    >
      <div className="text-center max-w-sm">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white mx-auto mb-5"
          style={{ background: 'linear-gradient(135deg, #4F8CFF, #22C55E)' }}
        >
          J
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-muted mb-6">
          An unexpected error occurred. You can try again or head back to the dashboard.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-[10px] text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: '#4F8CFF' }}
          >
            Try again
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 rounded-[10px] text-sm font-medium text-muted hover:text-foreground border transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
