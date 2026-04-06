'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BookMarked, FileUp, LibraryBig, Sparkles } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'

type ResourceTab = 'library' | 'markscheme'

interface ResourceItem {
  id: string
  name: string
  category: string
  board: string
  module: string
  note: string
  createdAt: string
}

const STORAGE_KEY = 'synaptiq.resources.library'

const DEFAULT_ITEMS: ResourceItem[] = [
  {
    id: 'aqa-pure-2024-ms',
    name: 'AQA Pure Paper 1 Mark Scheme',
    category: 'Mark Scheme',
    board: 'AQA',
    module: 'Pure',
    note: 'Use for modelling how method marks are awarded in integration questions.',
    createdAt: '2026-03-28T09:00:00.000Z',
  },
  {
    id: 'edexcel-stats-2023-paper',
    name: 'Edexcel Statistics Practice Paper',
    category: 'Past Paper',
    board: 'Edexcel',
    module: 'Statistics',
    note: 'Great for conditional probability and hypothesis testing practice.',
    createdAt: '2026-03-30T16:30:00.000Z',
  },
]

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function ResourcesClient() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<ResourceTab>('library')
  const [items, setItems] = useState<ResourceItem[]>(DEFAULT_ITEMS)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [form, setForm] = useState({
    name: '',
    category: 'Mark Scheme',
    board: 'AQA',
    module: 'Pure',
    note: '',
  })

  useEffect(() => {
    const requested = searchParams.get('tab')
    if (requested === 'library' || requested === 'markscheme') setTab(requested)
  }, [searchParams])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      setItems(JSON.parse(saved) as ResourceItem[])
    } catch {
      // ignore invalid local data
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }
  }, [items])

  const groupedCounts = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1
      return acc
    }, {})
  }, [items])

  function addResource() {
    const name = (selectedFileName || form.name).trim()
    if (!name) return

    setItems(prev => [
      {
        id: uid(),
        name,
        category: form.category,
        board: form.board,
        module: form.module,
        note: form.note.trim(),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])

    setSelectedFileName('')
    setForm({ name: '', category: 'Mark Scheme', board: 'AQA', module: 'Pure', note: '' })
  }

  return (
    <AuthPageShell
      title="Resources"
      subtitle="Upload references, organise past papers, and coach yourself with mark schemes"
      action={
        <Link href="/papers" className="px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#4F8CFF' }}>
          Open past papers →
        </Link>
      }
    >
      <div className="space-y-6 max-w-6xl">
        <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-primary font-medium">Migrated from the legacy dashboard</p>
              <h2 className="text-xl font-semibold text-foreground mt-1">Keep your study files in one place</h2>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'library', label: 'Resource library', icon: LibraryBig },
                { id: 'markscheme', label: 'Mark scheme coach', icon: BookMarked },
              ].map(item => {
                const Icon = item.icon
                const active = tab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id as ResourceTab)}
                    className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                    style={{
                      background: active ? 'rgba(79,140,255,0.14)' : 'rgba(255,255,255,0.04)',
                      color: active ? '#4F8CFF' : '#9AA4AF',
                      border: active ? '1px solid rgba(79,140,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {tab === 'library' && (
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 mb-4">
                <FileUp className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Add a resource</h3>
              </div>

              <div className="space-y-3">
                <input
                  type="file"
                  onChange={e => setSelectedFileName(e.target.files?.[0]?.name ?? '')}
                  className="w-full text-sm text-muted"
                />
                <input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Or type a resource title"
                  className="w-full px-3 py-2.5 rounded-[10px] text-sm text-foreground outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={form.category}
                    onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-[10px] text-sm text-foreground outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <option>Mark Scheme</option>
                    <option>Past Paper</option>
                    <option>Revision Notes</option>
                    <option>Worked Example</option>
                  </select>
                  <select
                    value={form.board}
                    onChange={e => setForm(prev => ({ ...prev, board: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-[10px] text-sm text-foreground outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <option>AQA</option>
                    <option>Edexcel</option>
                    <option>OCR</option>
                    <option>WJEC</option>
                  </select>
                </div>
                <input
                  value={form.module}
                  onChange={e => setForm(prev => ({ ...prev, module: e.target.value }))}
                  placeholder="Module (Pure, Statistics, Mechanics...)"
                  className="w-full px-3 py-2.5 rounded-[10px] text-sm text-foreground outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <textarea
                  value={form.note}
                  onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
                  rows={4}
                  placeholder="Optional note: what is this useful for?"
                  className="w-full px-3 py-2.5 rounded-[10px] text-sm text-foreground outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <button
                  onClick={addResource}
                  className="px-4 py-2.5 rounded-[10px] text-sm font-semibold text-white"
                  style={{ background: '#4F8CFF' }}
                >
                  Save to library
                </button>
              </div>
            </section>

            <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Saved resources</h3>
                  <p className="text-sm text-muted">{items.length} item(s) tracked in this browser session.</p>
                </div>
                <div className="flex gap-2 flex-wrap text-xs text-muted">
                  {Object.entries(groupedCounts).map(([label, count]) => (
                    <span key={label} className="px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {label}: {count}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{item.name}</div>
                        <div className="text-xs text-primary mt-1">{item.board} · {item.module} · {item.category}</div>
                      </div>
                      <span className="text-[11px] text-muted">{new Date(item.createdAt).toLocaleDateString('en-GB')}</span>
                    </div>
                    {item.note && <p className="text-sm text-muted mt-3 leading-6">{item.note}</p>}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'markscheme' && (
          <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Mark scheme coach</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'Decode the command word',
                  text: 'Identify whether the examiner wants explanation, proof, evaluation, or a final exact form.',
                },
                {
                  title: 'Protect the method marks',
                  text: 'Write every algebraic step cleanly so you still score even if the final answer slips.',
                },
                {
                  title: 'Match the board style',
                  text: 'Use precise notation and phrasing that mirrors AQA, Edexcel, OCR, or WJEC expectations.',
                },
              ].map(card => (
                <div key={card.title} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-sm font-semibold text-foreground mb-2">{card.title}</div>
                  <p className="text-sm text-muted leading-6">{card.text}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-3 mt-5">
              {[
                { href: '/formulas?tab=command-words', label: 'Command words guide' },
                { href: '/papers', label: 'Past paper practice' },
                { href: '/work-checker', label: 'Check my working' },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl p-4 block text-sm font-medium"
                  style={{ background: 'rgba(79,140,255,0.08)', color: '#4F8CFF', border: '1px solid rgba(79,140,255,0.18)' }}
                >
                  {link.label} →
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AuthPageShell>
  )
}
