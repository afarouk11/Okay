'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

type Note = {
  id: string
  title: string
  content: string
  subject: string
  tags: string[]
  created_at: string
  text: string
  tag: string | undefined
}

type DraftNote = {
  id: string | null
  text: string
  subject: string
  tag: string
}

const EMPTY_DRAFT: DraftNote = { id: null, text: '', subject: '', tag: '' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function NotesClient() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useAuth()

  const [notes, setNotes] = useState<Note[]>([])
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [filter, setFilter] = useState('All')
  const [draft, setDraft] = useState<DraftNote>(EMPTY_DRAFT)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  const fetchNotes = useCallback(async () => {
    if (!token) return
    setFetching(true)
    try {
      const res = await fetch('/api/notes', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setNotes(json.notes ?? [])
      }
    } catch {
      // no-op
    } finally {
      setFetching(false)
    }
  }, [token])

  useEffect(() => {
    if (token) fetchNotes()
  }, [token, fetchNotes])

  const subjects = ['All', ...Array.from(new Set(notes.map(n => n.subject).filter(Boolean)))]

  const filtered = notes
    .filter(n => filter === 'All' || n.subject === filter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  function selectNote(note: Note) {
    setDraft({ id: note.id, text: note.text ?? note.content, subject: note.subject, tag: note.tag ?? '' })
    setError(null)
  }

  function newNote() {
    setDraft(EMPTY_DRAFT)
    setError(null)
  }

  async function handleSave() {
    if (!token) return
    if (!draft.text.trim()) { setError('Note content is required.'); return }
    if (!draft.subject.trim()) { setError('Subject is required.'); return }
    setError(null)
    setSaving(true)
    try {
      const isNew = draft.id === null
      const res = await fetch('/api/notes', {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          isNew
            ? { text: draft.text, subject: draft.subject, tag: draft.tag || undefined }
            : { id: draft.id, text: draft.text, subject: draft.subject, tag: draft.tag || undefined }
        ),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to save note.'); return }
      const saved: Note = json.note
      if (isNew) {
        setNotes(prev => [saved, ...prev])
      } else {
        setNotes(prev => prev.map(n => n.id === saved.id ? saved : n))
      }
      setDraft({ id: saved.id, text: saved.text ?? saved.content, subject: saved.subject, tag: saved.tag ?? '' })
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!token || !draft.id) return
    setDeleting(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: draft.id }),
      })
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== draft.id))
        setDraft(EMPTY_DRAFT)
        setError(null)
      } else {
        const json = await res.json()
        setError(json.error ?? 'Failed to delete note.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#0B0F14' }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#4F8CFF', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0B0F14' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          title="My Notes"
          subtitle="Study notes across all subjects"
          userName={user.email?.split('@')[0] ?? 'Student'}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel: note list */}
          <div className="flex flex-col w-72 shrink-0 border-r border-white/5 overflow-hidden">
            {/* Filter bar */}
            <div className="flex items-center gap-1 px-3 py-3 flex-wrap border-b border-white/5">
              {subjects.map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                  style={
                    filter === s
                      ? { background: '#4F8CFF22', color: '#4F8CFF', border: '1px solid #4F8CFF55' }
                      : { background: 'transparent', color: '#8B9CB5', border: '1px solid #ffffff10' }
                  }
                >
                  {s}
                </button>
              ))}
            </div>

            {/* New note button */}
            <div className="px-3 py-2 border-b border-white/5">
              <button
                onClick={newNote}
                className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: '#4F8CFF', color: '#fff' }}
              >
                + New Note
              </button>
            </div>

            {/* Notes list */}
            <div className="flex-1 overflow-y-auto">
              {fetching ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#4F8CFF', borderTopColor: 'transparent' }} />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-sm py-12 px-4" style={{ color: '#8B9CB5' }}>
                  {notes.length === 0
                    ? "No notes yet — click 'New Note' to get started"
                    : 'No notes for this subject.'}
                </p>
              ) : (
                filtered.map(note => {
                  const isActive = draft.id === note.id
                  return (
                    <button
                      key={note.id}
                      onClick={() => selectNote(note)}
                      className="w-full text-left px-4 py-3 border-b transition-colors"
                      style={{
                        borderColor: '#ffffff08',
                        background: isActive ? '#4F8CFF14' : 'transparent',
                        borderLeft: isActive ? '2px solid #4F8CFF' : '2px solid transparent',
                      }}
                    >
                      <p className="text-sm font-medium truncate" style={{ color: isActive ? '#4F8CFF' : '#E2E8F0' }}>
                        {note.title || '(untitled)'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {note.subject && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#C9A84C22', color: '#C9A84C' }}>
                            {note.subject}
                          </span>
                        )}
                        <span className="text-xs" style={{ color: '#8B9CB5' }}>
                          {formatDate(note.created_at)}
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Right panel: edit area */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="max-w-2xl w-full mx-auto flex flex-col gap-4">
                {draft.id === null && draft.text === '' && draft.subject === '' ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-3">
                    <p className="text-sm" style={{ color: '#8B9CB5' }}>
                      Select a note or create a new one.
                    </p>
                    <button
                      onClick={newNote}
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ background: '#4F8CFF', color: '#fff' }}
                    >
                      + New Note
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8B9CB5' }}>Subject *</label>
                      <input
                        type="text"
                        value={draft.subject}
                        onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
                        placeholder="e.g. Mathematics, Biology…"
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                        style={{
                          background: '#12181F',
                          border: '1px solid #ffffff15',
                          color: '#E2E8F0',
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8B9CB5' }}>Tag (optional)</label>
                      <input
                        type="text"
                        value={draft.tag}
                        onChange={e => setDraft(d => ({ ...d, tag: e.target.value }))}
                        placeholder="e.g. revision, exam"
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                        style={{
                          background: '#12181F',
                          border: '1px solid #ffffff15',
                          color: '#E2E8F0',
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8B9CB5' }}>Content *</label>
                      <textarea
                        value={draft.text}
                        onChange={e => setDraft(d => ({ ...d, text: e.target.value }))}
                        placeholder="Write your note here…"
                        rows={14}
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y transition-colors"
                        style={{
                          background: '#12181F',
                          border: '1px solid #ffffff15',
                          color: '#E2E8F0',
                          lineHeight: '1.7',
                        }}
                      />
                    </div>

                    {error && (
                      <p className="text-sm" style={{ color: '#F87171' }}>{error}</p>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
                        style={{ background: '#4F8CFF', color: '#fff' }}
                      >
                        {saving ? 'Saving…' : 'Save Note'}
                      </button>

                      {draft.id !== null && (
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="px-5 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
                          style={{ background: '#F8717122', color: '#F87171', border: '1px solid #F8717133' }}
                        >
                          {deleting ? 'Deleting…' : 'Delete'}
                        </button>
                      )}

                      <button
                        onClick={newNote}
                        className="px-4 py-2 rounded-lg text-sm transition-colors"
                        style={{ color: '#8B9CB5', border: '1px solid #ffffff10' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
