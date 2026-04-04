'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Play, Lock } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import Link from 'next/link'

const TOPICS = [
  {
    category: 'Pure Mathematics',
    color: '#4F8CFF',
    lessons: [
      { id: 'algebra',        title: 'Algebra & Functions',          level: 'AS',   free: true  },
      { id: 'coord-geo',      title: 'Coordinate Geometry',          level: 'AS',   free: true  },
      { id: 'sequences',      title: 'Sequences & Series',           level: 'AS',   free: false },
      { id: 'trig',           title: 'Trigonometry',                 level: 'AS',   free: false },
      { id: 'exponentials',   title: 'Exponentials & Logarithms',    level: 'AS',   free: false },
      { id: 'differentiation',title: 'Differentiation',              level: 'A2',   free: false },
      { id: 'integration',    title: 'Integration',                  level: 'A2',   free: false },
      { id: 'vectors',        title: 'Vectors',                      level: 'A2',   free: false },
    ],
  },
  {
    category: 'Statistics',
    color: '#22C55E',
    lessons: [
      { id: 'stats-data',     title: 'Statistical Sampling',        level: 'AS',   free: true  },
      { id: 'stats-prob',     title: 'Probability',                  level: 'AS',   free: false },
      { id: 'stats-dist',     title: 'Statistical Distributions',    level: 'AS',   free: false },
      { id: 'stats-hyp',      title: 'Hypothesis Testing',           level: 'A2',   free: false },
    ],
  },
  {
    category: 'Mechanics',
    color: '#8B5CF6',
    lessons: [
      { id: 'mech-model',     title: 'Modelling in Mechanics',       level: 'AS',   free: true  },
      { id: 'mech-kine',      title: 'Kinematics',                   level: 'AS',   free: false },
      { id: 'mech-forces',    title: 'Forces & Newton\'s Laws',      level: 'AS',   free: false },
      { id: 'mech-moments',   title: 'Moments',                      level: 'A2',   free: false },
    ],
  },
]

export default function LessonsClient() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="flex min-h-screen" style={{ background: '#0B0F14' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col ml-60">
        <Header title="AI Lessons" subtitle="Interactive lessons with Jarvis" />

        <main className="flex-1 px-8 py-6 space-y-8">
          {/* Hero */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-card p-6 flex items-center gap-6"
            style={{
              background: 'linear-gradient(135deg, rgba(79,140,255,0.08), rgba(139,92,246,0.06))',
              border: '1px solid rgba(79,140,255,0.15)',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(79,140,255,0.12)', border: '1px solid rgba(79,140,255,0.25)' }}
            >
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Interactive AI Lessons</h2>
              <p className="text-sm text-muted mt-1">
                Jarvis teaches each topic step-by-step. Ask questions, get instant explanations, build real understanding.
              </p>
            </div>
            <Link href="/chat" className="ml-auto">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-medium text-white flex-shrink-0"
                style={{ background: '#4F8CFF' }}
              >
                <Play className="w-4 h-4" />
                Start with Jarvis
              </motion.button>
            </Link>
          </motion.div>

          {/* Topic categories */}
          {TOPICS.map((cat, ci) => (
            <motion.section
              key={cat.category}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: ci * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                <h3 className="text-sm font-semibold text-foreground">{cat.category}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {cat.lessons.map((lesson, li) => (
                  <motion.div
                    key={lesson.id}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.35, delay: ci * 0.1 + li * 0.04 }}
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}
                    onClick={() => setSelected(lesson.id)}
                    className="group rounded-card p-4 cursor-pointer"
                    style={{
                      background: selected === lesson.id ? `${cat.color}10` : 'rgba(18,24,33,0.8)',
                      border: selected === lesson.id
                        ? `1px solid ${cat.color}40`
                        : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          background: `${cat.color}15`,
                          color: cat.color,
                          border: `1px solid ${cat.color}30`,
                        }}
                      >
                        {lesson.level}
                      </span>
                      {!lesson.free && (
                        <Lock className="w-3.5 h-3.5 text-muted/40" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                      {lesson.title}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5">
                      {lesson.free ? (
                        <span className="text-[10px] text-accent font-medium">Free</span>
                      ) : (
                        <span className="text-[10px] text-muted">Pro</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ))}
        </main>
      </div>
    </div>
  )
}
