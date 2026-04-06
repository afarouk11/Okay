'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

// ── Types ─────────────────────────────────────────────────────────────────────

type TeachMode = 'standard' | 'guided' | 'test' | 'eli5';
type MessageRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  time: string;
}

interface Memory {
  type?: string;
  content?: string;
  topic?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TEACH_MODES: Record<TeachMode, { label: string; desc: string; suffix: string }> = {
  standard: {
    label: 'Standard',
    desc: 'Clear step-by-step explanations with worked examples.',
    suffix: '',
  },
  guided: {
    label: 'Guided',
    desc: 'Jarvis breaks every solution into micro-steps and asks you to attempt each one.',
    suffix: '\n\nGUIDED MODE: Break every problem into the smallest possible numbered steps. After each step, pause and ask the student to attempt the next one. Never give the complete solution at once.',
  },
  test: {
    label: 'Test',
    desc: 'No hints — Jarvis quizzes you to test your knowledge.',
    suffix: '\n\nTEST MODE: Do NOT explain or hint unprompted. Ask the student a targeted question and evaluate their answer. Only explain after two failed attempts.',
  },
  eli5: {
    label: 'ELI5',
    desc: "Concepts explained simply — like you're 5 years old.",
    suffix: "\n\nELI5 MODE: Use very simple everyday language and concrete analogies. Avoid all jargon. Use relatable real-world examples.",
  },
};

const BASE_SYSTEM = `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), an expert A-Level Mathematics assistant for UK students studying AQA, Edexcel, OCR, or WJEC.

Your role:
- Explain mathematical concepts clearly, step-by-step, in a patient and encouraging way.
- Use correct A-Level terminology and notation.
- When writing mathematical expressions, wrap inline maths in $...$ and display maths in $$...$$
- Break down complex problems into numbered steps.
- Point out common mistakes and exam tips where relevant.
- Cover all A-Level topics: Algebra, Calculus, Trigonometry, Statistics, Mechanics, and Further Maths.`;

const PAGE_MAP = [
  { keywords: ['past paper', 'past papers', 'exam paper'], url: '/papers', label: 'Past Papers' },
  { keywords: ['flashcard', 'flashcards'], url: '/study?tab=flashcards', label: 'Flashcards & Revision' },
  { keywords: ['lesson', 'lessons', 'topic list'], url: '/lessons', label: 'Lessons' },
  { keywords: ['question', 'questions', 'practice question', 'quiz'], url: '/questions', label: 'Practice Questions' },
  { keywords: ['formula', 'formula sheet', 'calculator', 'glossary'], url: '/formulas', label: 'Reference Tools' },
  { keywords: ['resource', 'resources', 'mark scheme', 'markscheme'], url: '/resources', label: 'Resources' },
  { keywords: ['work checker', 'essay', 'check my working'], url: '/work-checker', label: 'Work Checker' },
  { keywords: ['exam sim', 'exam simulator', 'mock exam', 'timed exam'], url: '/exam-sim', label: 'Exam Simulator' },
  { keywords: ['mind map', 'mindmap'], url: '/mindmap', label: 'Mind Map' },
  { keywords: ['wellbeing', 'well being', 'pomodoro', 'focus timer'], url: '/wellbeing', label: 'Wellbeing' },
  { keywords: ['pricing', 'price', 'upgrade', 'subscribe', 'plan', 'plans'], url: '/pricing', label: 'Pricing' },
  { keywords: ['progress', 'analytics', 'my stats', 'dashboard'], url: '/dashboard', label: 'Dashboard' },
  { keywords: ['contact', 'support', 'help'], url: '/contact', label: 'Contact & Support' },
  { keywords: ['note', 'notes', 'revision note'], url: '/notes', label: 'Notes' },
];

const NAV_TRIGGER = /\b(take me|go to|navigate to|open|show me|bring me|switch to)\b/i;

function detectNavIntent(text: string): { url: string; label: string } | null {
  if (!NAV_TRIGGER.test(text)) return null;
  const lower = text.toLowerCase();
  for (const page of PAGE_MAP) {
    if (page.keywords.some(kw => lower.includes(kw))) return page;
  }
  return null;
}

const QUICK_PROMPTS = [
  'Explain integration by parts with an example',
  'How do I differentiate ln(x²+1)?',
  'What is the chain rule?',
  'Explain the binomial expansion',
  'How do I find the area under a curve?',
  'Explain normal distribution and z-scores',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitize(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/`/g, '&#x60;');
}

function formatTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function makeId(): string {
  return Math.random().toString(36).slice(2);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function JarvisPageClient() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [teachMode, setTeachMode] = useState<TeachMode>('standard');
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const [lastSession, setLastSession] = useState<Memory | null>(null);
  const [toast, setToast] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<Array<{ role: MessageRole; content: string }>>([]);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (loading) return;

    async function init() {
      let lastMemory: Memory | null = null;

      if (token) {
        try {
          const r = await fetch('/api/memory', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (r.ok) {
            const { memories } = await r.json() as { memories: Memory[] };
            if (memories?.length) {
              lastMemory = memories[0];
              setLastSession(memories[0]);
            }
          }
        } catch (_) {}
      }

      let welcomeText = "Hi! I'm **J.A.R.V.I.S.**, your A-Level Maths AI assistant. 👋\n\n";
      if (lastMemory?.topic) {
        welcomeText += `Last time we worked on **${sanitize(lastMemory.topic)}**. Ready to continue?\n\n`;
      }
      welcomeText +=
        "I can help you with:\n" +
        "- **Pure Maths** — Calculus, Algebra, Trigonometry, Proof\n" +
        "- **Statistics** — Probability, Distributions, Hypothesis Testing\n" +
        "- **Mechanics** — Forces, Kinematics, Moments\n\n" +
        "Ask me anything or pick a suggestion below! 🚀";

      setMessages([{ id: makeId(), role: 'assistant', content: welcomeText, time: formatTime() }]);
    }
    init();
  }, [loading, token]);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(''), 5000);
  }, []);

  const effectiveSystem = BASE_SYSTEM + TEACH_MODES[teachMode].suffix;

  const sendMessage = useCallback(async (text?: string) => {
    const textToSend = (text ?? input).trim();
    if (!textToSend || isLoading) return;

    const navTarget = detectNavIntent(textToSend);
    if (navTarget) {
      const navMsg: ChatMessage = { id: makeId(), role: 'user', content: textToSend, time: formatTime() };
      const replyMsg: ChatMessage = { id: makeId(), role: 'assistant', content: `Sure! Taking you to **${navTarget.label}** now… 🚀`, time: formatTime() };
      setMessages(m => [...m, navMsg, replyMsg]);
      setInput('');
      setTimeout(() => { router.push(navTarget.url); }, 900);
      return;
    }

    setIsLoading(true);
    setInput('');
    setShowQuickPrompts(false);

    const userMsg: ChatMessage = { id: makeId(), role: 'user', content: textToSend, time: formatTime() };
    setMessages(m => [...m, userMsg]);
    historyRef.current.push({ role: 'user', content: textToSend });

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const r = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: historyRef.current,
          systemPrompt: effectiveSystem,
        }),
      });
      const data = await r.json() as { response?: string; error?: string; code?: string };

      if (!r.ok) {
        if (data.code === 'TRIAL_LIMIT') {
          setMessages(m => [...m, { id: makeId(), role: 'assistant', content: "⚠️ You've reached your daily message limit. Upgrade to **Pro** to continue!", time: formatTime() }]);
        } else {
          showToast(data.error ?? 'Something went wrong — please try again.');
          historyRef.current.pop();
        }
        return;
      }

      const reply = data.response ?? '';
      setMessages(m => [...m, { id: makeId(), role: 'assistant', content: reply, time: formatTime() }]);
      historyRef.current.push({ role: 'assistant', content: reply });
    } catch (_) {
      showToast('Connection error — please try again.');
      historyRef.current.pop();
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, token, effectiveSystem, showToast, router]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--black)' }}>
        <div className="spin" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        .spin { width:32px;height:32px;border:2px solid rgba(0,212,255,0.15);border-top-color:#00D4FF;border-radius:50%;animation:spin .8s linear infinite }
        @keyframes spin { to { transform: rotate(360deg) } }

        #jarvis-nav { position:sticky;top:0;z-index:200;background:rgba(3,5,13,0.88);backdrop-filter:blur(20px);border-bottom:1px solid rgba(0,212,255,0.10);padding:0 2rem;height:64px;display:flex;align-items:center;justify-content:space-between;gap:1rem }
        .nav-brand { display:flex;align-items:center;gap:.6rem;font-family:'Playfair Display',serif;font-weight:700;font-size:1.15rem;text-decoration:none;color:var(--white) }
        .nav-brand-icon { width:30px;height:30px;background:linear-gradient(135deg,#00D4FF,#B060FF);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.9rem }
        .nav-brand-text em { font-style:normal;background:linear-gradient(135deg,#00D4FF,#B060FF);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text }
        .nav-badge { font-size:.72rem;font-weight:700;background:rgba(0,212,255,0.10);border:1px solid rgba(0,212,255,0.22);color:#00D4FF;border-radius:20px;padding:.2rem .65rem }
        .nav-back { display:inline-flex;align-items:center;gap:.5rem;color:#5A7499;font-size:.85rem;text-decoration:none;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:20px;padding:.3rem .85rem;transition:color .2s }
        .nav-back:hover { color:var(--white) }

        .page-layout { display:grid;grid-template-columns:320px 1fr;gap:1.5rem;max-width:1280px;margin:0 auto;padding:1.5rem 2rem 3rem;align-items:start }
        @media(max-width:900px) { .page-layout { grid-template-columns:1fr } }

        .glass-card { background:rgba(13,17,32,0.72);backdrop-filter:blur(20px);border:1px solid rgba(0,212,255,0.10);border-radius:14px;padding:1.4rem;box-shadow:0 8px 32px rgba(0,0,0,0.6) }
        .glass-card+.glass-card { margin-top:1rem }
        .section-label { font-size:.7rem;font-weight:700;color:#00D4FF;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.75rem }

        .left-panel { position:sticky;top:80px }

        .orb-wrap { display:flex;flex-direction:column;align-items:center;gap:1rem;padding:1.5rem }
        .orb { width:100px;height:100px;border-radius:50%;background:radial-gradient(circle at 38% 36%,#55eeff 0%,#00D4FF 35%,#090979 100%);box-shadow:0 0 30px rgba(0,212,255,0.5),0 0 60px rgba(0,140,255,0.25);animation:orbPulse 3s ease-in-out infinite }
        @keyframes orbPulse { 0%,100%{box-shadow:0 0 30px rgba(0,212,255,0.5),0 0 60px rgba(0,140,255,0.25)} 50%{box-shadow:0 0 50px rgba(0,212,255,0.8),0 0 90px rgba(0,140,255,0.4)} }
        @media(prefers-reduced-motion:reduce){ .orb { animation:none } }
        .orb-status { font-size:.8rem;font-weight:700;color:#00D4FF;text-transform:uppercase;letter-spacing:.08em }
        .orb-sub { font-size:.75rem;color:#5A7499;text-align:center }

        .teach-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:.35rem }
        .teach-btn { padding:.45rem .3rem;border-radius:8px;font-size:.73rem;font-weight:600;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);color:#5A7499;cursor:pointer;transition:all .18s;white-space:nowrap }
        .teach-btn:hover { color:var(--white);border-color:rgba(176,96,255,0.3) }
        .teach-btn.active { background:rgba(176,96,255,0.10);border-color:rgba(176,96,255,0.35);color:#B060FF }
        .teach-desc { font-size:.78rem;color:#5A7499;margin-top:.6rem;line-height:1.5 }

        .memory-card { font-size:.8rem;color:rgba(232,240,255,0.7);line-height:1.6;padding:.5rem .65rem;background:rgba(0,212,255,0.04);border-left:2px solid rgba(0,212,255,0.25);border-radius:0 6px 6px 0 }

        .right-panel { display:flex;flex-direction:column;gap:1rem }

        .chat-box { display:flex;flex-direction:column;min-height:520px;max-height:72vh }
        .chat-messages { flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.85rem }
        .chat-messages::-webkit-scrollbar { width:4px }
        .chat-messages::-webkit-scrollbar-thumb { background:rgba(0,212,255,0.2);border-radius:2px }

        .msg { display:flex;gap:.75rem;align-items:flex-start }
        .msg-avatar { width:32px;height:32px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:700 }
        .msg.user-msg { flex-direction:row-reverse }
        .msg.user-msg .msg-avatar { background:linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.1));border:1px solid rgba(201,168,76,0.3);color:#C9A84C }
        .msg.ai-msg .msg-avatar { background:linear-gradient(135deg,rgba(0,212,255,0.2),rgba(176,96,255,0.1));border:1px solid rgba(0,212,255,0.3);color:#00D4FF }
        .msg-body { max-width:78%;display:flex;flex-direction:column;gap:.3rem }
        .msg.user-msg .msg-body { align-items:flex-end }
        .msg-bubble { padding:.65rem .9rem;border-radius:12px;font-size:.88rem;line-height:1.65;word-break:break-word }
        .user-msg .msg-bubble { background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.18);color:var(--white) }
        .ai-msg .msg-bubble { background:rgba(13,17,32,0.9);border:1px solid rgba(0,212,255,0.14);color:var(--white) }
        .ai-msg .msg-bubble strong { color:#E8F0FF }
        .ai-msg .msg-bubble code { background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.2);border-radius:4px;padding:.1rem .3rem;font-family:'Space Mono',monospace;font-size:.82rem }
        .msg-time { font-size:.7rem;color:#5A7499 }

        .typing { display:flex;gap:4px;align-items:center;padding:.5rem .9rem }
        .typing-dot { width:6px;height:6px;border-radius:50%;background:#00D4FF;animation:typingDot 1.2s ease-in-out infinite }
        .typing-dot:nth-child(2) { animation-delay:.2s }
        .typing-dot:nth-child(3) { animation-delay:.4s }
        @keyframes typingDot { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-6px);opacity:1} }

        .quick-prompts { padding:.75rem 1rem;border-top:1px solid rgba(0,212,255,0.07);display:flex;flex-wrap:wrap;gap:.4rem }
        .qp-label { width:100%;font-size:.72rem;color:#5A7499;margin-bottom:.15rem }
        .qp-btn { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:.28rem .75rem;font-size:.77rem;cursor:pointer;color:#5A7499;white-space:nowrap;transition:all .18s }
        .qp-btn:hover { color:var(--white);border-color:rgba(0,212,255,0.3);background:rgba(0,212,255,0.06) }

        .chat-input-area { display:flex;gap:.75rem;align-items:flex-end;padding:1rem;border-top:1px solid rgba(0,212,255,0.07) }
        .chat-input-area textarea { flex:1;resize:none;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:var(--white);font-family:var(--font);font-size:.88rem;padding:.6rem .85rem;line-height:1.55;min-height:40px;max-height:160px;outline:none;transition:border-color .2s }
        .chat-input-area textarea:focus { border-color:rgba(0,212,255,0.35) }
        .chat-input-area textarea::placeholder { color:#5A7499 }
        .send-btn { display:inline-flex;align-items:center;gap:.4rem;padding:.55rem 1.2rem;background:linear-gradient(135deg,#00D4FF,#7B40FF);border:none;border-radius:10px;color:#fff;font-size:.85rem;font-weight:600;cursor:pointer;transition:opacity .2s;white-space:nowrap }
        .send-btn:hover { opacity:.9 }
        .send-btn:disabled { opacity:.45;cursor:not-allowed }

        .toast { position:fixed;bottom:5rem;left:50%;transform:translateX(-50%);background:rgba(13,17,32,0.95);border:1px solid rgba(248,113,113,0.3);color:#fca5a5;padding:.5rem 1.2rem;border-radius:20px;font-size:.82rem;pointer-events:none;z-index:9999;transition:opacity .3s }

        .plan-link-card { padding:1rem 1.4rem;display:flex;align-items:center;justify-content:space-between;gap:1rem }
        .plan-link-card p { font-size:.82rem;color:#5A7499;margin:0 }
        .plan-link-btn { display:inline-flex;align-items:center;gap:.4rem;padding:.45rem 1rem;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:20px;color:#C9A84C;font-size:.78rem;font-weight:600;text-decoration:none;white-space:nowrap;transition:all .2s }
        .plan-link-btn:hover { background:rgba(201,168,76,0.2) }
      `}</style>

      <nav id="jarvis-nav">
        <Link href="/" className="nav-brand">
          <span className="nav-brand-icon">⚡</span>
          <span className="nav-brand-text">Synap<em>tiq</em></span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <span className="nav-badge">AI Maths Assistant</span>
          <Link href="/" className="nav-back">← Back to App</Link>
        </div>
      </nav>

      <div className="page-layout">
        <aside className="left-panel">
          <div className="glass-card orb-wrap">
            <div className="orb" role="img" aria-label="J.A.R.V.I.S. avatar" />
            <p className="orb-status">{isLoading ? 'THINKING…' : 'READY'}</p>
            <p className="orb-sub">A-Level Mathematics Assistant</p>
          </div>

          <div className="glass-card" style={{ marginTop: '1rem' }}>
            <div className="section-label">🎓 Teaching mode</div>
            <div className="teach-grid">
              {(Object.entries(TEACH_MODES) as [TeachMode, typeof TEACH_MODES.standard][]).map(([key, val]) => (
                <button
                  key={key}
                  className={`teach-btn${teachMode === key ? ' active' : ''}`}
                  onClick={() => setTeachMode(key)}
                  aria-pressed={teachMode === key}
                >
                  {val.label}
                </button>
              ))}
            </div>
            <p className="teach-desc">{TEACH_MODES[teachMode].desc}</p>
          </div>

          {lastSession && (
            <div className="glass-card" style={{ marginTop: '1rem' }}>
              <div className="section-label">📚 Last session</div>
              <div className="memory-card">
                {lastSession.topic && <span><strong>Topic:</strong> {sanitize(lastSession.topic)}</span>}
                {lastSession.content && !lastSession.topic && <span>{sanitize(lastSession.content.slice(0, 80))}</span>}
              </div>
            </div>
          )}

          <div className="glass-card plan-link-card" style={{ marginTop: '1rem' }}>
            <p>Need a structured study plan for today?</p>
            <Link href="/plan" className="plan-link-btn">📅 Daily Plan</Link>
          </div>
        </aside>

        <main className="right-panel">
          <div className="glass-card chat-box">
            <div className="chat-messages" aria-live="polite" aria-label="Conversation">
              {messages.map(msg => (
                <div key={msg.id} className={`msg ${msg.role === 'user' ? 'user-msg' : 'ai-msg'}`}>
                  <div className="msg-avatar" aria-hidden="true">{msg.role === 'user' ? '🎓' : 'J'}</div>
                  <div className="msg-body">
                    <div
                      className="msg-bubble"
                      dangerouslySetInnerHTML={{
                        __html: msg.role === 'user'
                          ? sanitize(msg.content).replace(/\n/g, '<br>')
                          : formatMessageContent(msg.content),
                      }}
                    />
                    <span className="msg-time">{msg.time}</span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="msg ai-msg">
                  <div className="msg-avatar">J</div>
                  <div className="msg-body">
                    <div className="msg-bubble">
                      <div className="typing" role="status" aria-label="Jarvis is thinking">
                        <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {showQuickPrompts && (
              <div className="quick-prompts">
                <div className="qp-label">Try asking…</div>
                {QUICK_PROMPTS.map(p => (
                  <button key={p} className="qp-btn" onClick={() => sendMessage(p)}>{p}</button>
                ))}
              </div>
            )}

            <div className="chat-input-area">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); autoResize(e.target); }}
                onKeyDown={handleKeyDown}
                placeholder="Ask J.A.R.V.I.S. a maths question… (Enter to send)"
                rows={1}
                aria-label="Type your question"
                maxLength={4000}
              />
              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
              >
                Send →
              </button>
            </div>
          </div>
        </main>
      </div>

      {toast && <div className="toast" role="alert">{toast}</div>}
    </>
  );
}

function formatMessageContent(raw: string): string {
  const blocks = raw.split(/\n{2,}/);
  return blocks.map(block => {
    const lines = block.split('\n');
    if (lines.every(l => /^\d+\.\s/.test(l.trim()))) {
      const items = lines.map(l => `<li>${inlineFmt(l.trim().replace(/^\d+\.\s+/, ''))}</li>`).join('');
      return `<ol>${items}</ol>`;
    }
    if (lines.every(l => /^[-*]\s/.test(l.trim()))) {
      const items = lines.map(l => `<li>${inlineFmt(l.trim().replace(/^[-*]\s+/, ''))}</li>`).join('');
      return `<ul>${items}</ul>`;
    }
    return `<p>${lines.map(inlineFmt).join('<br>')}</p>`;
  }).join('');
}

function inlineFmt(text: string): string {
  const s = sanitize(text);
  return s
    .replace(/&#x60;([^<]+?)&#x60;/g, (_, p) => `<code>${p}</code>`)
    .replace(/\*\*([^*]+?)\*\*/g, (_, p) => `<strong>${p}</strong>`)
    .replace(/\*([^*]+?)\*/g, (_, p) => `<em>${p}</em>`);
}
