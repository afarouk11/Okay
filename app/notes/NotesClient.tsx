'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Pencil, Check, X, Loader2, StickyNote, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { useAuth } from '@/lib/useAuth'

type Note = {
  id: string
  title: string
  content: string
  subject: string
  tags: string[]
  created_at: string
  text?: string
  tag?: string
}

const SUBJECTS = ['Pure Maths', 'Statistics', 'Mechanics', 'General', 'Other']

export default function NotesClient() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useAuth()

  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // New note form
  const [showForm, setShowForm] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newSubject, setNewSubject] = useState('General')
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editSubject, setEditSubject] = useState('')

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  const fetchNotes = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/notes', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setNotes(data.notes ?? [])
      }
    } catch {
      // no-op
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) fetchNotes()
  }, [token, fetchNotes])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !newContent.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: newContent, subject: newSubject, tag: newTag || undefined }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.note) setNotes(prev => [data.note, ...prev])
        setNewContent('')
        setNewTag('')
        setShowForm(false)
      }
    } catch {
      // no-op
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit(id: string) {
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, text: editContent, subject: editSubject }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.note) {
          setNotes(prev => prev.map(n => n.id === id ? data.note : n))
        }
      }
    } catch {
      // no-op
    } finally {
      setSaving(false)
      setEditId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!token || !window.confirm('Delete this note?')) return
    try {
      await fetch('/api/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      })
      setNotes(prev => prev.filter(n => n.id !== id))
    } catch {
      // no-op
    }
  }

  function startEdit(note: Note) {
    setEditId(note.id)
    setEditContent(note.content ?? note.text ?? '')
    setEditSubject(note.subject ?? 'General')
  }

  const filtered = notes.filter(n => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (n.content ?? n.text ?? '').toLowerCase().includes(q) ||
      n.subject?.toLowerCase().includes(q) ||
      (n.tags ?? []).some(t => t.toLowerCase().includes(q))
    )
  })

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#0B0F14' }}>
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen" style={{ background: '#0B0F14' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col ml-60">
        <Header
          title="Notes"
          subtitle="Capture and revisit your study notes"
          action={
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'linear-gradient(135deg,#4F8CFF,#22C55E)', color: '#fff' }}
            >
              <Plus className="w-4 h-4" />
              New note
            </motion.button>
          }
        />

        <main className="flex-1 px-8 py-6 max-w-4xl">

          {/* New note form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mb-6"
              >
                <form
                  onSubmit={handleCreate}
                  className="rounded-xl p-5 space-y-3"
                  style={{ background: 'rgba(79,140,255,0.06)', border: '1px solid rgba(79,140,255,0.2)' }}
                >
                  <textarea
                    required
                    autoFocus
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    rows={4}
                    placeholder="Write your note here…"
                    className="w-full bg-transparent text-sm outline-none resize-none"
                    style={{ color: '#F0EEF8' }}
                  />
                  <div className="flex items-center gap-3 flex-wrap">
                    <select
                      value={newSubject}
                      onChange={e => setNewSubject(e.target.value)}
                      className="px-3 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
                    >
                      {SUBJECTS.map(s => <option key={s} value={s} style={{ background: '#121821' }}>{s}</option>)}
                    </select>
                    <input
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      placeholder="Tag (optional)"
                      className="px-3 py-1.5 rounded-lg text-xs outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
                    />
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="px-3 py-1.5 rounded-lg text-xs"
                        style={{ color: '#9AA4AF' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: '#4F8CFF', color: '#fff' }}
                      >
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Save
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search bar */}
          {notes.length > 0 && (
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7394' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notes…"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#F0EEF8' }}
              />
            </div>
          )}

          {/* Empty state */}
          {notes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <StickyNote className="w-10 h-10 mb-4" style={{ color: '#4F8CFF', opacity: 0.4 }} />
              <p className="font-medium mb-1" style={{ color: '#F0EEF8' }}>No notes yet</p>
              <p className="text-sm mb-5" style={{ color: '#9AA4AF' }}>Capture key ideas, formulas, and reminders.</p>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(79,140,255,0.12)', border: '1px solid rgba(79,140,255,0.25)', color: '#4F8CFF' }}
              >
                <Plus className="w-4 h-4" />
                Create your first note
              </button>
            </div>
          )}

          {/* Notes grid */}
          {filtered.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((note, i) => (
                <motion.div
                  key={note.id}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-xl p-4 flex flex-col gap-2"
                  style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {editId === note.id ? (
                    /* Edit mode */
                    <div className="space-y-2">
                      <textarea
                        autoFocus
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        rows={4}
                        className="w-full bg-transparent text-sm outline-none resize-none"
                        style={{ color: '#F0EEF8' }}
                      />
                      <select
                        value={editSubject}
                        onChange={e => setEditSubject(e.target.value)}
                        className="px-2 py-1 rounded-lg text-xs outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
                      >
                        {SUBJECTS.map(s => <option key={s} value={s} style={{ background: '#121821' }}>{s}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveEdit(note.id)} className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium" style={{ background: '#22C55E20', color: '#22C55E' }}>
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                        </button>
                        <button onClick={() => setEditId(null)} className="px-3 py-1 rounded-lg text-xs" style={{ color: '#9AA4AF' }}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <>
                      <p className="text-sm whitespace-pre-wrap flex-1" style={{ color: '#E2E8F0' }}>
                        {(note.content ?? note.text ?? '').length > 300
                          ? `${(note.content ?? note.text ?? '').slice(0, 300)}…`
                          : (note.content ?? note.text ?? '')}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {note.subject && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(79,140,255,0.12)', color: '#4F8CFF', border: '1px solid rgba(79,140,255,0.2)' }}>
                              {note.subject}
                            </span>
                          )}
                          {(note.tags?.[0] ?? note.tag) && (
                            <span className="text-xs" style={{ color: '#6B7394' }}>#{note.tags?.[0] ?? note.tag}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => startEdit(note)} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: '#9AA4AF' }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(note.id)} className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10" style={{ color: '#9AA4AF' }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {note.created_at && (
                        <p className="text-xs" style={{ color: '#6B7394' }}>
                          {new Date(note.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {search && filtered.length === 0 && (
            <p className="text-center py-10 text-sm" style={{ color: '#6B7394' }}>No notes match &ldquo;{search}&rdquo;</p>
          )}
        </main>
      </div>
    </div>
  )
}
