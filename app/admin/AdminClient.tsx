'use client'

import { useState, useCallback } from 'react'

type AdminStats = {
  total_users: number
  active_today: number
  total_xp: number
  total_messages: number
  plan_breakdown: Record<string, number>
}

type AdminUser = {
  id: string
  name: string | null
  email: string
  plan: string
  xp: number
  level: number
  created_at: string
}

type UsersResponse = {
  users: AdminUser[]
  total: number
  page: number
}

const GOLD = '#C9A84C'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#1E2030] bg-[#0D0E1A] p-5 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-widest text-gray-500">{label}</span>
      <span className="text-2xl font-bold" style={{ color: GOLD }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  )
}

export default function AdminClient() {
  const [adminKey, setAdminKey] = useState('')
  const [inputKey, setInputKey] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [usersData, setUsersData] = useState<UsersResponse | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usersLoading, setUsersLoading] = useState(false)

  const fetchStats = useCallback(async (key: string) => {
    const res = await fetch('/api/admin?action=stats', {
      headers: { 'x-admin-key': key },
    })
    if (res.status === 403) throw new Error('Invalid admin key.')
    if (!res.ok) throw new Error('Failed to load stats.')
    return res.json() as Promise<AdminStats>
  }, [])

  const fetchUsers = useCallback(async (key: string, p: number) => {
    setUsersLoading(true)
    try {
      const res = await fetch(`/api/admin?action=users&page=${p}`, {
        headers: { 'x-admin-key': key },
      })
      if (!res.ok) throw new Error('Failed to load users.')
      const data = (await res.json()) as UsersResponse
      setUsersData(data)
    } finally {
      setUsersLoading(false)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await fetchStats(inputKey)
      setStats(data)
      setAdminKey(inputKey)
      setIsLoggedIn(true)
      await fetchUsers(inputKey, 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = async (newPage: number) => {
    setPage(newPage)
    await fetchUsers(adminKey, newPage)
  }

  const handleLogout = () => {
    setAdminKey('')
    setInputKey('')
    setIsLoggedIn(false)
    setStats(null)
    setUsersData(null)
    setPage(1)
    setError(null)
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090E]">
        <div className="w-full max-w-sm rounded-2xl border border-[#1E2030] bg-[#0D0E1A] p-8 shadow-2xl">
          <h1 className="text-xl font-bold mb-1" style={{ color: GOLD }}>
            Admin Dashboard
          </h1>
          <p className="text-gray-500 text-sm mb-6">Enter your admin key to continue.</p>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="password"
              value={inputKey}
              onChange={e => setInputKey(e.target.value)}
              placeholder="Admin key"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-[#1E2030] bg-[#08090E] px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#C9A84C] text-sm"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !inputKey}
              className="w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ background: GOLD, color: '#08090E' }}
            >
              {loading ? 'Verifying…' : 'Access Dashboard'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const totalPages = usersData ? Math.ceil(usersData.total / 50) : 1

  return (
    <div className="min-h-screen bg-[#08090E] text-white">
      <header className="border-b border-[#1E2030] px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold" style={{ color: GOLD }}>
          Synaptiq Admin
        </h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Logout
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stat cards */}
        {stats && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
              Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={stats.total_users} />
              <StatCard label="Active Today" value={stats.active_today} />
              <StatCard label="Total XP" value={stats.total_xp} />
              <StatCard label="Total Messages" value={stats.total_messages} />
            </div>

            {/* Plan breakdown */}
            {Object.keys(stats.plan_breakdown).length > 0 && (
              <div className="mt-4 rounded-xl border border-[#1E2030] bg-[#0D0E1A] p-5">
                <span className="text-xs uppercase tracking-widest text-gray-500 block mb-3">
                  Plan Breakdown
                </span>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(stats.plan_breakdown).map(([plan, count]) => (
                    <div key={plan} className="flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ background: GOLD }}
                      />
                      <span className="text-sm capitalize text-gray-300">{plan}</span>
                      <span className="text-sm font-bold text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Users table */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
            Users {usersData ? `(${usersData.total.toLocaleString()})` : ''}
          </h2>
          <div className="rounded-xl border border-[#1E2030] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E2030] bg-[#0D0E1A]">
                    {['Name / Email', 'Plan', 'XP', 'Level', 'Joined'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-semibold"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        Loading…
                      </td>
                    </tr>
                  ) : usersData && usersData.users.length > 0 ? (
                    usersData.users.map(user => (
                      <tr
                        key={user.id}
                        className="border-b border-[#1E2030] last:border-0 hover:bg-[#0D0E1A] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">
                            {user.name ?? '—'}
                          </div>
                          <div className="text-gray-500 text-xs">{user.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                            style={{
                              background: 'rgba(201,168,76,0.12)',
                              color: GOLD,
                            }}
                          >
                            {user.plan ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300">{(user.xp ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-300">{user.level ?? 1}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1 || usersLoading}
                  className="px-3 py-1.5 rounded-lg border border-[#1E2030] hover:border-[#C9A84C] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages || usersLoading}
                  className="px-3 py-1.5 rounded-lg border border-[#1E2030] hover:border-[#C9A84C] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
