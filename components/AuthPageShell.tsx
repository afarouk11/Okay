'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { useAuth } from '@/lib/useAuth'

interface AuthPageShellProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}

export default function AuthPageShell({ title, subtitle, action, children }: AuthPageShellProps) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#0B0F14' }}>
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const userName = user.email?.split('@')[0] ?? 'Student'

  return (
    <div className="flex min-h-screen" style={{ background: '#0B0F14' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col ml-60">
        <Header title={title} subtitle={subtitle} userName={userName} action={action} />
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  )
}
