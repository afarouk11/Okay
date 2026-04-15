'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Plus, Trash2, Bell, BellOff } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'

interface Exam {
  id: string
  subject: string
  board: string
  date: string // ISO date string
}

const BOARDS = ['AQA', 'Edexcel', 'OCR', 'WJEC', 'Eduqas']

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}

function urgencyColour(days: number) {
  if (days <= 7)  return { text: '#EF4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)' }
  if (days <= 21) return { text: '#FB923C', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.2)' }
  if (days <= 56) return { text: '#C9A84C', bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.2)' }
  return { text: '#22C55E', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.15)' }
}

export default function ExamsClient() {
  const [exams, setExams] = useState<Exam[]>([])
  const [subject, setSubject] = useState('')
  const [board, setBoard] = useState('AQA')
  const [date, setDate] = useState('')
  const [notifGranted, setNotifGranted] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('synaptiq_exams')
      if (stored) setExams(JSON.parse(stored))
    } catch {}
    setNotifGranted(typeof Notification !== 'undefined' && Notification.permission === 'granted')
  }, [])

  function save(updated: Exam[]) {
    setExams(updated)
    try { localStorage.setItem('synaptiq_exams', JSON.stringify(updated)) } catch {}
  }

  function addExam() {
    if (!subject.trim() || !date) return
    const newExam: Exam = { id: Date.now().toString(), subject: subject.trim(), board, date }
    save([...exams, newExam].sort((a, b) => a.date.localeCompare(b.date)))
    setSubject('')
    setDate('')
  }

  function removeExam(id: string) {
    save(exams.filter(e => e.id !== id))
  }

  async function requestNotifications() {
    if (typeof Notification === 'undefined') return
    const perm = await Notification.requestPermission()
    setNotifGranted(perm === 'granted')
  }

  const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date))
  const upcoming = sorted.filter(e => daysUntil(e.date) >= 0)
  const past     = sorted.filter(e => daysUntil(e.date) < 0)

  return (
    <AuthPageShell title="Exam Countdown" subtitle="Track your upcoming exams and stay on schedule">
      <div className="max-w-2xl space-y-6">

        {/* Add exam form */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(12,14,20,0.82)', border: '1px solid rgba(201,168,76,0.12)' }}
        >
          <p className="font-semibold text-sm mb-4">Add Exam</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="col-span-1">
              <label className="block text-xs mb-1" style={{ color: '#6B7394' }}>Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Maths"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#6B7394' }}>Board</label>
              <select
                value={board}
                onChange={e => setBoard(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
              >
                {BOARDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#6B7394' }}>Exam Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
              />
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={addExam}
              disabled={!subject.trim() || !date}
              className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-opacity"
              style={{ background: '#C9A84C', color: '#08090E', opacity: !subject.trim() || !date ? 0.5 : 1 }}
            >
              <Plus className="w-4 h-4" />
              Add Exam
            </button>
            <button
              onClick={requestNotifications}
              className="px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              style={{ background: 'rgba(96,165,250,0.08)', color: notifGranted ? '#60A5FA' : '#6B7394', border: '1px solid rgba(96,165,250,0.2)' }}
            >
              {notifGranted ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              {notifGranted ? 'Reminders on' : 'Enable Reminders'}
            </button>
          </div>
        </div>

        {/* Upcoming exams */}
        {upcoming.length === 0 ? (
          <div className="text-center py-12" style={{ color: '#6B7394' }}>
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No exams added yet</p>
            <p className="text-sm mt-1">Add your exam dates above to start the countdown.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(exam => {
              const days = daysUntil(exam.date)
              const col = urgencyColour(days)
              return (
                <div
                  key={exam.id}
                  className="flex items-center justify-between rounded-xl px-5 py-4"
                  style={{ background: col.bg, border: `1px solid ${col.border}` }}
                >
                  <div>
                    <p className="font-semibold text-sm text-foreground">{exam.subject}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B7394' }}>
                      {exam.board} · {new Date(exam.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-black" style={{ color: col.text }}>{days}</p>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: col.text }}>
                        {days === 0 ? 'TODAY' : days === 1 ? 'day' : 'days'}
                      </p>
                    </div>
                    <button
                      onClick={() => removeExam(exam.id)}
                      className="opacity-40 hover:opacity-80 transition-opacity"
                      style={{ color: '#EF4444' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Past exams */}
        {past.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: '#6B7394' }}>Past Exams</p>
            <div className="space-y-2">
              {past.map(exam => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between rounded-xl px-4 py-3 opacity-50"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="text-sm">{exam.subject} · {exam.board}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: '#6B7394' }}>
                      {new Date(exam.date).toLocaleDateString('en-GB')}
                    </span>
                    <button onClick={() => removeExam(exam.id)} className="opacity-50 hover:opacity-100">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AuthPageShell>
  )
}
