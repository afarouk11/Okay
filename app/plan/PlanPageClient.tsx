'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';

interface PlanSession {
  topic: string;
  duration_min: number;
  type: 'Study' | 'Practice' | 'Revision' | 'Break';
  why: string;
}

interface Plan {
  date: string;
  time_available: number;
  sessions: PlanSession[];
}

const TYPE_COLORS: Record<string, string> = {
  Study:    'rgba(0,212,255,0.15)',
  Practice: 'rgba(176,96,255,0.15)',
  Revision: 'rgba(201,168,76,0.15)',
  Break:    'rgba(0,255,157,0.10)',
};
const TYPE_BORDERS: Record<string, string> = {
  Study:    'rgba(0,212,255,0.35)',
  Practice: 'rgba(176,96,255,0.35)',
  Revision: 'rgba(201,168,76,0.35)',
  Break:    'rgba(0,255,157,0.25)',
};
const TYPE_ICONS: Record<string, string> = {
  Study: '📖', Practice: '✏️', Revision: '🔄', Break: '☕',
};

export default function PlanPageClient() {
  const { token, loading } = useAuth();
  const [timeAvailable, setTimeAvailable] = useState(60);
  const [focus, setFocus] = useState('');
  const [saveTasks, setSaveTasks] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  async function generatePlan() {
    setIsGenerating(true);
    setError('');
    setPlan(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const r = await fetch('/api/plan', {
        method: 'POST',
        headers,
        body: JSON.stringify({ time_available: timeAvailable, focus: focus || undefined, save_tasks: saveTasks }),
      });
      const data = await r.json() as { plan?: Plan; error?: string };
      if (!r.ok) { setError(data.error ?? 'Failed to generate plan'); return; }
      if (data.plan) setPlan(data.plan);
    } catch (_) {
      setError('Connection error — please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><div className="spin" /></div>;
  }

  return (
    <>
      <style>{`
        .spin { width:32px;height:32px;border:2px solid rgba(0,212,255,0.15);border-top-color:#00D4FF;border-radius:50%;animation:spin .8s linear infinite }
        @keyframes spin { to { transform: rotate(360deg) } }
        #plan-nav { position:sticky;top:0;z-index:200;background:rgba(3,5,13,0.88);backdrop-filter:blur(20px);border-bottom:1px solid rgba(0,212,255,0.10);padding:0 2rem;height:64px;display:flex;align-items:center;justify-content:space-between }
        .nav-brand { display:flex;align-items:center;gap:.6rem;font-family:'Playfair Display',serif;font-weight:700;font-size:1.15rem;text-decoration:none;color:#E8F0FF }
        .nav-brand-icon { width:30px;height:30px;background:linear-gradient(135deg,#00D4FF,#B060FF);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.9rem }
        .nav-brand-text em { font-style:normal;background:linear-gradient(135deg,#00D4FF,#B060FF);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text }
        .nav-back { display:inline-flex;align-items:center;gap:.5rem;color:#5A7499;font-size:.85rem;text-decoration:none;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:20px;padding:.3rem .85rem }
        .nav-back:hover { color:#E8F0FF }
        .page-wrap { max-width:820px;margin:0 auto;padding:2rem }
        .hero-label { display:inline-flex;align-items:center;gap:.5rem;background:rgba(201,168,76,0.07);border:1px solid rgba(201,168,76,0.2);border-radius:20px;padding:.3rem .85rem;font-size:.75rem;font-weight:700;color:#C9A84C;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.8rem }
        .hero h1 { font-family:'Playfair Display',serif;font-size:clamp(1.6rem,3vw,2.2rem);font-weight:900;margin-bottom:.5rem }
        .hero h1 span { background:linear-gradient(135deg,#C9A84C,#F0D080);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text }
        .hero p { color:#5A7499;font-size:.9rem;margin-bottom:2rem }
        .glass-card { background:rgba(13,17,32,0.72);backdrop-filter:blur(20px);border:1px solid rgba(0,212,255,0.10);border-radius:14px;padding:1.5rem;box-shadow:0 8px 32px rgba(0,0,0,0.6);margin-bottom:1.5rem }
        .form-label { font-size:.82rem;font-weight:600;color:#E8F0FF;margin-bottom:.5rem;display:block }
        .form-hint { font-size:.75rem;color:#5A7499;margin-top:.2rem }
        .time-slider { width:100%;accent-color:#C9A84C;margin:.5rem 0 }
        .time-display { font-size:1.4rem;font-weight:700;color:#C9A84C;font-family:'Space Mono',monospace }
        .form-input { width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#E8F0FF;font-size:.88rem;padding:.6rem .85rem;outline:none;transition:border-color .2s;font-family:inherit }
        .form-input:focus { border-color:rgba(201,168,76,0.4) }
        .form-input::placeholder { color:#5A7499 }
        .checkbox-row { display:flex;align-items:center;gap:.6rem;cursor:pointer;font-size:.85rem;color:#5A7499 }
        .checkbox-row input { accent-color:#C9A84C;width:16px;height:16px }
        .generate-btn { width:100%;padding:.85rem;background:linear-gradient(135deg,#C9A84C,#A07830);border:none;border-radius:12px;color:#08090E;font-size:1rem;font-weight:700;cursor:pointer;transition:opacity .2s;display:flex;align-items:center;justify-content:center;gap:.5rem }
        .generate-btn:hover:not(:disabled) { opacity:.9 }
        .generate-btn:disabled { opacity:.5;cursor:not-allowed }
        .error-msg { background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.25);border-radius:10px;padding:.75rem 1rem;color:#fca5a5;font-size:.85rem;margin-bottom:1rem }
        .plan-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem }
        .plan-title { font-family:'Playfair Display',serif;font-size:1.15rem;font-weight:700 }
        .plan-meta { font-size:.78rem;color:#5A7499 }
        .sessions { display:flex;flex-direction:column;gap:.75rem }
        .session-card { border-radius:10px;padding:1rem 1.2rem;display:flex;align-items:flex-start;gap:.85rem }
        .session-icon { font-size:1.3rem;flex-shrink:0;margin-top:.1rem }
        .session-topic { font-weight:700;font-size:.95rem;margin-bottom:.2rem }
        .session-meta { font-size:.78rem;color:#5A7499;margin-bottom:.3rem }
        .session-why { font-size:.8rem;color:rgba(232,240,255,0.6);line-height:1.5 }
        .session-badge { display:inline-block;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;border-radius:20px;padding:.1rem .55rem;margin-left:.4rem }
        .jarvis-link { display:inline-flex;align-items:center;gap:.4rem;padding:.5rem 1.1rem;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);border-radius:20px;color:#00D4FF;font-size:.82rem;font-weight:600;text-decoration:none;transition:all .2s }
        .jarvis-link:hover { background:rgba(0,212,255,0.15) }
      `}</style>

      <nav id="plan-nav">
        <Link href="/" className="nav-brand">
          <span className="nav-brand-icon">⚡</span>
          <span className="nav-brand-text">Synap<em>tiq</em></span>
        </Link>
        <Link href="/jarvis" className="nav-back">← Back to Jarvis</Link>
      </nav>

      <div className="page-wrap">
        <div className="hero">
          <div className="hero-label">📅 AI Study Planner</div>
          <h1>Your <span>Daily Study Plan</span></h1>
          <p>Tell Jarvis how much time you have and your focus area. It will create a personalised, time-boxed plan based on your weak topics and spaced-repetition schedule.</p>
        </div>

        <div className="glass-card">
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">⏱ Time available today</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="range" className="time-slider"
                min={15} max={180} step={15}
                value={timeAvailable}
                onChange={e => setTimeAvailable(Number(e.target.value))}
              />
              <span className="time-display">{timeAvailable}m</span>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">🎯 Focus area (optional)</label>
            <input
              type="text" className="form-input"
              placeholder="e.g. Trigonometry, Integration, Statistics…"
              value={focus} onChange={e => setFocus(e.target.value)}
              maxLength={120}
            />
            <p className="form-hint">Leave blank to let Jarvis decide based on your weak topics.</p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="checkbox-row">
              <input type="checkbox" checked={saveTasks} onChange={e => setSaveTasks(e.target.checked)} />
              Save plan sessions as tasks in my task list
            </label>
          </div>

          {error && <div className="error-msg">⚠️ {error}</div>}

          <button
            className="generate-btn"
            onClick={generatePlan}
            disabled={isGenerating}
          >
            {isGenerating ? <><div className="spin" style={{ width: 20, height: 20, borderWidth: 2 }} /> Generating…</> : '✨ Generate My Study Plan'}
          </button>
        </div>

        {plan && (
          <div className="glass-card">
            <div className="plan-header">
              <div>
                <p className="plan-title">📅 Today&apos;s Study Plan</p>
                <p className="plan-meta">{plan.date} · {plan.time_available} minutes total</p>
              </div>
              <Link href="/jarvis" className="jarvis-link">🤖 Ask Jarvis for help</Link>
            </div>
            <div className="sessions">
              {plan.sessions.map((s, i) => (
                <div
                  key={i}
                  className="session-card"
                  style={{
                    background: TYPE_COLORS[s.type] ?? 'rgba(255,255,255,0.03)',
                    border: `1px solid ${TYPE_BORDERS[s.type] ?? 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  <div className="session-icon">{TYPE_ICONS[s.type] ?? '📚'}</div>
                  <div style={{ flex: 1 }}>
                    <div className="session-topic">
                      {s.topic}
                      <span
                        className="session-badge"
                        style={{ background: TYPE_COLORS[s.type], border: `1px solid ${TYPE_BORDERS[s.type]}`, color: TYPE_BORDERS[s.type].replace('0.35', '1') }}
                      >
                        {s.type}
                      </span>
                    </div>
                    <div className="session-meta">⏱ {s.duration_min} minutes</div>
                    <div className="session-why">{s.why}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
