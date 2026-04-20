'use client'

import Link from 'next/link'
import { BrainCircuit, Network } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'

const CLUSTERS = [
  {
    title: 'Pure Maths',
    accent: '#4F8CFF',
    topics: ['Differentiation', 'Integration', 'Binomial Expansion', 'Logs & Exponentials', 'Vectors'],
  },
  {
    title: 'Statistics',
    accent: '#22C55E',
    topics: ['Probability Trees', 'Normal Distribution', 'Hypothesis Testing', 'Correlation'],
  },
  {
    title: 'Mechanics',
    accent: '#F59E0B',
    topics: ['SUVAT', 'Projectiles', 'Moments', 'Forces on a slope'],
  },
]

export default function MindmapClient() {
  return (
    <AuthPageShell
      title="Mind Map"
      subtitle="See how topics connect so you can revise in logical clusters"
      action={
        <Link href="/lessons" className="px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#4F8CFF' }}>
          Browse lessons →
        </Link>
      }
    >
      <div className="space-y-6 max-w-6xl">
        <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">A-Level Maths concept map</h2>
          </div>
          <p className="text-sm text-muted max-w-3xl leading-6">
            Use this page like a revision navigator: start with a big topic cluster, then jump into lessons or ask Jarvis to connect the ideas for you.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {CLUSTERS.map(cluster => (
            <div key={cluster.title} className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: `1px solid ${cluster.accent}33` }}>
              <div className="flex items-center gap-2 mb-4">
                <Network className="w-4 h-4" style={{ color: cluster.accent }} />
                <h3 className="text-lg font-semibold text-foreground">{cluster.title}</h3>
              </div>
              <div className="flex gap-2 flex-wrap">
                {cluster.topics.map(topic => (
                  <Link
                    key={topic}
                    href={`/chat?q=${encodeURIComponent(`Teach me ${topic} with a mind-map style explanation`)}`}
                    className="px-3 py-2 rounded-full text-sm"
                    style={{ background: `${cluster.accent}14`, color: cluster.accent, border: `1px solid ${cluster.accent}33` }}
                  >
                    {topic}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-card p-5" style={{ background: 'rgba(18,24,33,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-lg font-semibold text-foreground mb-3">Suggested revision pathways</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { title: 'Calculus pathway', desc: 'Differentiation → stationary points → integration → area under curves', href: '/lessons' },
              { title: 'Exam-technique pathway', desc: 'Ask Jarvis about command words, worked examples, and mark-scheme tips', href: '/jarvis' },
              { title: 'Confidence pathway', desc: 'Chat through weak topics, then test yourself with Exam Sim', href: '/exam-sim' },
            ].map(item => (
              <Link key={item.title} href={item.href} className="rounded-xl p-4 block" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-sm font-semibold text-foreground mb-1">{item.title}</div>
                <p className="text-xs text-muted leading-5">{item.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AuthPageShell>
  )
}
