'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserSupabase } from './supabase';

export interface AuthState {
  user: { id: string; email?: string } | null;
  session: { access_token: string } | null;
  token: string | null;
  loading: boolean;
}

const REFRESH_MARGIN_MS = 5 * 60 * 1000; // refresh 5 min before expiry

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    token: null,
    loading: true,
  });
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    if (!supabase) {
      // Demo mode — try localStorage fallback
      try {
        const token = localStorage.getItem('synaptiq_token');
        const saved = localStorage.getItem('synaptiq_user');
        if (token) {
          const user = saved ? JSON.parse(saved) : { id: 'demo' };
          setState({ user, session: { access_token: token }, token, loading: false });
          return;
        }
      } catch (_) {}
      setState(s => ({ ...s, loading: false }));
      return;
    }

    function scheduleRefresh(expiresAt: number) {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      const msLeft = expiresAt * 1000 - Date.now() - REFRESH_MARGIN_MS;
      if (msLeft > 0) {
        refreshTimer.current = setTimeout(async () => {
          const { data } = await supabase!.auth.refreshSession();
          if (data.session) {
            setState({
              user: data.session.user,
              session: data.session,
              token: data.session.access_token,
              loading: false,
            });
            scheduleRefresh(data.session.expires_at ?? 0);
          }
        }, msLeft);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        session: session ?? null,
        token: session?.access_token ?? null,
        loading: false,
      });
      if (session?.expires_at) scheduleRefresh(session.expires_at);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session: session ?? null,
        token: session?.access_token ?? null,
        loading: false,
      });
      if (session?.expires_at) scheduleRefresh(session.expires_at);
    });

    return () => {
      subscription.unsubscribe();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

  return state;
}
