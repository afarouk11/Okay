'use client'

import { useEffect, useState } from 'react'
import { Target, Flame, CheckCircle } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'

interface Goals {
  questions: number
  minutes: number
}

interface TodayProgress {
  questions: number
  minutes: number
  date: string
}

const STORAGE_KEY_GOALS    = 'synaptiq_goals'
const STORAGE_KEY_PROGRESS = 'synaptiq_today_progress'
const STORAGE_KEY_STREAK   = 'synaptiq_goals_streak'

export default function GoalsClient() {
  const [goals, setGoals]       = useState<Goals>({ questions: 10, minutes: 30 })
  const [today, setToday]       = useState<TodayProgress>({ questions: 0, minutes: 0, date: '' })
  const [streak, setStreak]     = useState(0)
  const [minuteInput, setMinuteInput] = useState('')
  const [questionInput, setQuestionInput] = useState('')

  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    try {
      const g = localStorage.getItem(STORAGE_KEY_GOALS)
      if (g) setGoals(JSON.parse(g))
      const p = localStorage.getItem(STORAGE_KEY_PROGRESS)
      if (p) {
        const parsed: TodayProgress = JSON.parse(p)
        setToday(parsed.date === todayStr ? parsed : { questions: 0, minutes: 0, date: todayStr })
      } else {
        setToday({ questions: 0, minutes: 0, date: todayStr })
      }
      const s = localStorage.getItem(STORAGE_KEY_STREAK)
      if (s) setStreak(Number(s))
    } catch {}
  }, [todayStr])

  function saveGoals(updated: Goals) {
    setGoals(updated)
    try { localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(updated)) } catch {}
  }

  function updateProgress(field: 'questions' | 'minutes', delta: number) {
    const updated = { ...today, [field]: Math.max(0, today[field] + delta), date: todayStr }
    setToday(updated)
    try { localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(updated)) } catch {}
    // Check goal completion
    const q = field === 'questions' ? updated.questions : today.questions
    const m = field === 'minutes' ? updated.minutes : today.minutes
    if ((goals.questions === 0 || q >= goals.questions) && (goals.minutes === 0 || m >= goals.minutes)) {
      const newStreak = streak + 1
      setStreak(newStreak)
      try { localStorage.setItem(STORAGE_KEY_STREAK, String(newStreak)) } catch {}
    }
  }

  function addManual() {
    const q = parseInt(questionInput) || 0
    const m = parseInt(minuteInput) || 0
    const updated = { ...today, questions: today.questions + q, minutes: today.minutes + m, date: todayStr }
    setToday(updated)
    try { localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(updated)) } catch {}
    setQuestionInput('')
    setMinuteInput('')
  }

  const qPct  = goals.questions > 0 ? Math.min(100, Math.round((today.questions / goals.questions) * 100)) : 100
  const mPct  = goals.minutes   > 0 ? Math.min(100, Math.round((today.minutes   / goals.minutes)   * 100)) : 100
  const totalPct = Math.round((qPct + mPct) / 2)
  const goalMet = qPct >= 100 && mPct >= 100

  return (
    <AuthPageShell title="Daily Goals" subtitle="Set a daily study target and track your habit">
      <div className="max-w-lg space-y-5">

        {/* Ring + status */}
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: 'rgba(12,14,20,0.88)', border: '1px solid rgba(201,168,76,0.15)' }}
        >
          <svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto mb-3" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="50" fill="none"
              stroke={goalMet ? '#22C55E' : '#C9A84C'} strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(totalPct / 100) * 314} 314`}
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          </svg>
          <p className="text-3xl font-black" style={{ color: goalMet ? '#22C55E' : '#C9A84C' }}>{totalPct}%</p>
          <p className="text-xs mt-1" style={{ color: '#6B7394' }}>of today&apos;s goal</p>
          {goalMet && (
            <p className="text-sm font-semibold mt-2 flex items-center justify-center gap-1.5" style={{ color: '#22C55E' }}>
              <CheckCircle className="w-4 h-4" />
              Goal complete for today!
            </p>
          )}
        </div>

        {/* Progress bars */}
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Questions */}
          <div>
            <div className="flex justify-between text-xs mb-1.5" style={{ color: '#6B7394' }}>
              <span>Questions answered</span>
              <span style={{ color: '#C9A84C' }}>
                {today.questions} {goals.questions > 0 ? `/ ${goals.questions}` : ''}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${qPct}%`, background: '#C9A84C' }} />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => updateProgress('questions', 1)} className="px-3 py-1 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: '#9AA4AF' }}>+1</button>
              <button onClick={() => updateProgress('questions', 5)} className="px-3 py-1 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: '#9AA4AF' }}>+5</button>
              <button onClick={() => updateProgress('questions', 10)} className="px-3 py-1 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: '#9AA4AF' }}>+10</button>
            </div>
          </div>

          {/* Minutes */}
          <div>
            <div className="flex justify-between text-xs mb-1.5" style={{ color: '#6B7394' }}>
              <span>Minutes studied</span>
              <span style={{ color: '#00D4FF' }}>
                {today.minutes} {goals.minutes > 0 ? `/ ${goals.minutes}` : ''}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${mPct}%`, background: '#00D4FF' }} />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => updateProgress('minutes', 5)}  className="px-3 py-1 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: '#9AA4AF' }}>+5m</button>
              <button onClick={() => updateProgress('minutes', 15)} className="px-3 py-1 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: '#9AA4AF' }}>+15m</button>
              <button onClick={() => updateProgress('minutes', 25)} className="px-3 py-1 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: '#9AA4AF' }}>+25m</button>
            </div>
          </div>

          {/* Manual entry */}
          <div className="pt-2 border-t flex gap-2 items-center" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <input
              value={questionInput}
              onChange={e => setQuestionInput(e.target.value)}
              placeholder="Questions"
              type="number"
              min="0"
              className="flex-1 rounded-lg px-3 py-2 text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
            />
            <input
              value={minuteInput}
              onChange={e => setMinuteInput(e.target.value)}
              placeholder="Minutes"
              type="number"
              min="0"
              className="flex-1 rounded-lg px-3 py-2 text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
            />
            <button
              onClick={addManual}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: '#C9A84C', color: '#08090E' }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Set goals */}
        <div
          className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="font-semibold text-sm mb-4">Set Daily Goals</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#6B7394' }}>Questions per day</label>
              <select
                value={goals.questions}
                onChange={e => saveGoals({ ...goals, questions: Number(e.target.value) })}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
              >
                {[0, 5, 10, 20, 50].map(n => <option key={n} value={n}>{n === 0 ? 'No goal' : `${n} questions`}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#6B7394' }}>Minutes studying</label>
              <select
                value={goals.minutes}
                onChange={e => saveGoals({ ...goals, minutes: Number(e.target.value) })}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0EEF8' }}
              >
                {[0, 15, 30, 60, 90].map(n => <option key={n} value={n}>{n === 0 ? 'No goal' : `${n} minutes`}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Streak */}
        <div
          className="rounded-xl px-5 py-4 flex items-center gap-4"
          style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.15)' }}
        >
          <Flame className="w-8 h-8 flex-shrink-0" style={{ color: '#FB923C' }} />
          <div>
            <p className="text-xl font-black" style={{ color: '#FB923C' }}>{streak}</p>
            <p className="text-xs" style={{ color: '#6B7394' }}>day goal streak</p>
          </div>
          {streak > 0 && (
            <p className="ml-auto text-sm" style={{ color: '#9AA4AF' }}>
              {streak >= 7 ? '🔥 On fire!' : streak >= 3 ? '📈 Building momentum' : '👍 Keep going!'}
            </p>
          )}
        </div>
      </div>
    </AuthPageShell>
  )
}
