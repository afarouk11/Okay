'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Users, Activity, CreditCard, TrendingUp, Search, ChevronLeft, ChevronRight, Loader2, AlertCircle, RefreshCw, Mail, Trash2 } from 'lucide-react'

type Stats = {
  total_users: number
  active_7d: number
  paying: number
  mrr: number
}

type User = {
  id: string
  name: string | null
  email: string
  plan: string | null
  subscription_status: string | null
  xp: number | null
  questions_answered: number | null
  created_at: string
}

type AdminState = 'locked' | 'loading' | 'unlocked'

export default function AdminClient() {
  const [adminKey, setAdminKey] = useState('')
  const [state, setState] = useState<AdminState>('locked')
  const [error, setError] = useState<string | null>(null)

  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)

  const authHeaders = useCallback(() => ({
    'x-admin-key': adminKey,
    'Content-Type': 'application/json',
  }), [adminKey])

  async function loadDashboard(key: string) {
    setState('loading')
    setError(null)
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin?action=stats', { headers: { 'x-admin-key': key } }),
        fetch('/api/admin?action=users&page=1', { headers: { 'x-admin-key': key } }),
      ])
      if (!statsRes.ok || !usersRes.ok) {
        const err = await statsRes.json().catch(() => ({}))
        setError(err.error || 'Invalid admin key')
        setState('locked')
        return
      }
      const [statsData, usersData] = await Promise.all([statsRes.json(), usersRes.json()])
      setStats(statsData)
      setUsers(usersData.users)
      setTotal(usersData.total)
      setPages(usersData.pages)
      setPage(1)
      setLastRefreshed(new Date().toLocaleTimeString())
      setState('unlocked')
    } catch {
      setError('Failed to connect to admin API')
      setState('locked')
    }
  }

  async function loadUsers(p: number) {
    try {
      const res = await fetch(`/api/admin?action=users&page=${p}`, { headers: authHeaders() })
      if (!res.ok) return
      const data = await res.json()
      setUsers(data.users)
      setTotal(data.total)
      setPages(data.pages)
      setPage(p)
    } catch {
      // no-op
    }
  }

  async function handleAction(action: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setActionLoading(action)
    setActionMsg(null)
    try {
      const body: Record<string, unknown> = {}
      if (action === 'reset_users') body.confirm = 'DELETE_ALL_USERS'
      const res = await fetch(`/api/admin?action=${action}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setActionMsg(data.error || 'Action failed'); return }
      if (action === 'send_weekly_emails') setActionMsg(`Sent ${data.sent} emails (${data.failed} failed)`)
      if (action === 'reset_users') setActionMsg(data.message)
      // Refresh stats after action
      const statsRes = await fetch('/api/admin?action=stats', { headers: authHeaders() })
      if (statsRes.ok) setStats(await statsRes.json())
    } catch {
      setActionMsg('Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredUsers = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (u.name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  function statusColor(status: string | null) {
    switch (status) {
      case 'active': return { bg: 'rgba(34,197,94,0.12)', color: '#22C55E', border: 'rgba(34,197,94,0.25)' }
      case 'cancelled': return { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.25)' }
      case 'past_due': return { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.25)' }
      default: return { bg: 'rgba(154,164,175,0.1)', color: '#9AA4AF', border: 'rgba(154,164,175,0.2)' }
    }
  }

  /* ─── Login screen ─── */
  if (state === 'locked' || state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0B0F14' }}>
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg,#ef4444,#f59e0b)' }}>
              <span className="text-white font-bold text-lg">✦</span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: '#F0EEF8' }}>Synapnode Admin</h1>
            <p className="text-sm mt-1" style={{ color: '#9AA4AF' }}>Restricted access</p>
          </div>

          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#9AA4AF' }}>Admin key</label>
              <input
                type="password"
                value={adminKey}
                onChange={e => setAdminKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadDashboard(adminKey)}
                placeholder="Enter admin key"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
              />
            </div>
            <motion.button
              onClick={() => loadDashboard(adminKey)}
              disabled={state === 'loading' || !adminKey}
              whileHover={(state === 'loading' || !adminKey) ? {} : { scale: 1.02 }}
              whileTap={(state === 'loading' || !adminKey) ? {} : { scale: 0.98 }}
              className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#ef4444,#f59e0b)', color: '#fff', opacity: (state === 'loading' || !adminKey) ? 0.6 : 1 }}
            >
              {state === 'loading' ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Access Dashboard'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  /* ─── Dashboard ─── */
  return (
    <div className="min-h-screen" style={{ background: '#0B0F14' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ background: 'rgba(11,15,20,0.92)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#ef4444,#f59e0b)' }}>
            <span className="text-white font-bold text-sm">✦</span>
          </div>
          <span className="font-bold text-sm" style={{ color: '#F0EEF8' }}>Synapnode Admin</span>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && <span className="text-xs" style={{ color: '#6B7394' }}>Updated {lastRefreshed}</span>}
          <motion.button
            onClick={() => loadDashboard(adminKey)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#9AA4AF' }}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </motion.button>
          <motion.button
            onClick={() => handleAction('send_weekly_emails')}
            disabled={actionLoading === 'send_weekly_emails'}
            whileHover={actionLoading === 'send_weekly_emails' ? {} : { scale: 1.03 }}
            whileTap={actionLoading === 'send_weekly_emails' ? {} : { scale: 0.97 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(79,140,255,0.12)', border: '1px solid rgba(79,140,255,0.2)', color: '#4F8CFF', opacity: actionLoading === 'send_weekly_emails' ? 0.6 : 1 }}
          >
            {actionLoading === 'send_weekly_emails' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            Send weekly emails
          </motion.button>
          <motion.button
            onClick={() => handleAction('reset_users', 'WARNING: This will delete ALL users and data. Are you absolutely sure?')}
            disabled={actionLoading === 'reset_users'}
            whileHover={actionLoading === 'reset_users' ? {} : { scale: 1.03 }}
            whileTap={actionLoading === 'reset_users' ? {} : { scale: 0.97 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', opacity: actionLoading === 'reset_users' ? 0.6 : 1 }}
          >
            {actionLoading === 'reset_users' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Reset all users
          </motion.button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {actionMsg && (
          <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(79,140,255,0.08)', border: '1px solid rgba(79,140,255,0.2)', color: '#4F8CFF' }}>
            {actionMsg}
          </div>
        )}

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Total Users', value: stats.total_users.toLocaleString(), icon: Users, color: '#4F8CFF' },
              { label: 'Active (7d)', value: stats.active_7d.toLocaleString(), icon: Activity, color: '#22C55E' },
              { label: 'Paying', value: stats.paying.toLocaleString(), icon: CreditCard, color: '#A78BFA' },
              { label: 'MRR', value: `£${stats.mrr.toLocaleString()}`, icon: TrendingUp, color: '#f59e0b' },
            ].map(({ label, value, icon: Icon, color }) => (
              <motion.div
                key={label}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="rounded-xl p-5"
                style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs" style={{ color: '#9AA4AF' }}>{label}</p>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold" style={{ color: '#F0EEF8' }}>{value}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Users table */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#F0EEF8' }}>
              All Users <span className="font-normal" style={{ color: '#6B7394' }}>({total.toLocaleString()})</span>
            </h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#6B7394' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter by name or email…"
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#F0EEF8', width: '220px' }}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['Name', 'Email', 'Plan', 'Status', 'XP', 'Questions', 'Joined'].map(col => (
                    <th key={col} className="text-left px-4 py-3 font-medium" style={{ color: '#6B7394' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, i) => {
                  const badge = statusColor(u.subscription_status)
                  return (
                    <tr key={u.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td className="px-4 py-3" style={{ color: '#E2E8F0' }}>{u.name ?? '—'}</td>
                      <td className="px-4 py-3" style={{ color: '#9AA4AF' }}>{u.email}</td>
                      <td className="px-4 py-3 capitalize" style={{ color: '#9AA4AF' }}>{u.plan ?? 'free'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs capitalize" style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                          {u.subscription_status ?? 'free'}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: '#9AA4AF' }}>{u.xp?.toLocaleString() ?? 0}</td>
                      <td className="px-4 py-3" style={{ color: '#9AA4AF' }}>{u.questions_answered?.toLocaleString() ?? 0}</td>
                      <td className="px-4 py-3" style={{ color: '#9AA4AF' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="text-xs" style={{ color: '#6B7394' }}>Page {page} of {pages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => loadUsers(page - 1)}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#9AA4AF' }}
                >
                  <ChevronLeft className="w-3 h-3" /> Prev
                </button>
                <button
                  onClick={() => loadUsers(page + 1)}
                  disabled={page >= pages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#9AA4AF' }}
                >
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
