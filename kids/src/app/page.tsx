'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import GcseSection from '@/components/GcseSection'
import ArithmeticSection from '@/components/ArithmeticSection'
import IqSection from '@/components/IqSection'

type Section = 'gcse' | 'arithmetic' | 'neuro'

function getInitialSection(): Section {
  if (typeof window === 'undefined') return 'gcse'
  const p = new URLSearchParams(window.location.search).get('section')
  if (p === 'gcse' || p === 'arithmetic' || p === 'neuro') return p
  return 'gcse'
}

export default function Home() {
  const [activePage, setActivePage] = useState<Section>('gcse')

  // On mount, read ?section= query param so main-app sidebar links deep-link here
  useEffect(() => {
    setActivePage(getInitialSection())
  }, [])

  const renderSection = () => {
    switch (activePage) {
      case 'gcse':        return <GcseSection />
      case 'arithmetic':  return <ArithmeticSection />
      case 'neuro':       return <IqSection />
      default:            return <GcseSection />
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#08090E' }}>
      <Sidebar active={activePage} onNavigate={setActivePage} />
      <main style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>
        {renderSection()}
      </main>
    </div>
  )
}
