'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/lib/useAuth'

interface AuthPageShellProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  /** Max content width. Default 'max-w-5xl'. Pass 'full' for no cap. */
  maxWidth?: string
}

export default function AuthPageShell({
  title,
  subtitle,
  action,
  children,
  maxWidth = 'max-w-5xl',
}: AuthPageShellProps) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#050810' }}>
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
             style={{ borderColor: '#C9A84C', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen" style={{ background: '#050810' }}>
      <Sidebar />

      <div className="flex-1 md:ml-[225px] flex flex-col min-h-screen">
        {/* Page top bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between pl-14 pr-4 md:px-8 h-[60px] flex-shrink-0"
             style={{
               background: 'rgba(5,8,16,0.9)',
               backdropFilter: 'blur(12px)',
               borderBottom: '1px solid rgba(255,255,255,0.05)',
             }}>
          <div>
            <h1 className="text-[15px] font-bold text-white leading-none">{title}</h1>
            {subtitle && <p className="text-[11px] mt-0.5" style={{ color: '#5A7499' }}>{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>

        {/* Content */}
        <main className={`flex-1 px-8 py-6 ${maxWidth !== 'full' ? maxWidth + ' w-full' : 'w-full'}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
