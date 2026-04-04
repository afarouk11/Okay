'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { createBrowserClient } from '@/lib/supabase'

export type AuthState = {
  user: User | null
  session: Session | null
  token: string | null
  loading: boolean
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    token: null,
    loading: true,
  })

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabaseRef = useRef(createBrowserClient())

  const scheduleRefresh = useCallback((session: Session | null) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const supabase = supabaseRef.current
    if (!session?.expires_at || !supabase) return

    // Refresh 5 minutes before expiry
    const expiresMs = session.expires_at * 1000
    const refreshAt = expiresMs - 5 * 60 * 1000
    const delay = refreshAt - Date.now()

    if (delay > 0) {
      refreshTimerRef.current = setTimeout(async () => {
        const { data } = await supabase.auth.refreshSession()
        if (data.session) {
          setState({
            user: data.session.user,
            session: data.session,
            token: data.session.access_token,
            loading: false,
          })
          scheduleRefresh(data.session)
        }
      }, delay)
    }
  }, [])

  useEffect(() => {
    const supabase = supabaseRef.current
    if (!supabase) {
      setState({ user: null, session: null, token: null, loading: false })
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        session,
        token: session?.access_token ?? null,
        loading: false,
      })
      scheduleRefresh(session ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        token: session?.access_token ?? null,
        loading: false,
      })
      scheduleRefresh(session ?? null)
    })

    return () => {
      subscription.unsubscribe()
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [scheduleRefresh])

  return state
}
