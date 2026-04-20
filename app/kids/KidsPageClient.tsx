'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import Sidebar from '../../kids/src/components/Sidebar'
import GcseSection from '../../kids/src/components/GcseSection'
import ArithmeticSection from '../../kids/src/components/ArithmeticSection'
import IqSection from '../../kids/src/components/IqSection'

export type KidsSection = 'gcse' | 'arithmetic' | 'iq'

const SECTION_COPY: Record<KidsSection, string> = {
  gcse: 'AI-generated GCSE Maths questions for ages 14–16.',
  arithmetic: 'Fast arithmetic drills for KS1 to KS3 learners.',
  iq: 'Reasoning and IQ-style practice for families and older learners.',
}

function normalizeSection(value: string): KidsSection {
  switch (value.toLowerCase()) {
    case 'arithmetic':
      return 'arithmetic'
    case 'iq':
      return 'iq'
    default:
      return 'gcse'
  }
}

export default function KidsPageClient({
  initialSection,
}: {
  initialSection: KidsSection
}) {
  const [activePage, setActivePage] = useState<KidsSection>(initialSection)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setActivePage(initialSection)
  }, [initialSection])

  function handleNavigate(page: string) {
    const next = normalizeSection(page)
    setActivePage(next)
    const target = next === 'gcse' ? pathname : `${pathname}?section=${next}`
    router.replace(target, { scroll: false })
  }

  function renderSection() {
    switch (activePage) {
      case 'arithmetic':
        return <ArithmeticSection />
      case 'iq':
        return <IqSection />
      case 'gcse':
      default:
        return <GcseSection />
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08090E' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(8,9,14,0.92)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'rgba(255,255,255,0.38)',
              marginBottom: '4px',
            }}
          >
            Synapnode family area
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
            Kids Section
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: '4px 0 0 0' }}>
            {SECTION_COPY[activePage]}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              borderRadius: '999px',
              border: '1px solid rgba(0,212,255,0.25)',
              background: 'rgba(0,212,255,0.08)',
              padding: '6px 10px',
              fontSize: '12px',
              color: '#00D4FF',
              fontWeight: 600,
            }}
          >
            {activePage === 'gcse' ? 'GCSE Maths' : activePage === 'arithmetic' ? 'Arithmetic' : 'IQ Training'}
          </span>

          <Link
            href="/"
            style={{
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.12)',
              padding: '8px 12px',
              color: 'rgba(255,255,255,0.82)',
              fontSize: '13px',
              textDecoration: 'none',
            }}
          >
            ← Back to main site
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 83px)' }}>
        <Sidebar active={activePage} onNavigate={handleNavigate} />
        <main style={{ flex: 1, minWidth: 0 }}>{renderSection()}</main>
      </div>
    </div>
  )
}
