'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import GcseSection from '@/components/GcseSection'
import ArithmeticSection from '@/components/ArithmeticSection'
import IqSection from '@/components/IqSection'

export default function Home() {
  const [activePage, setActivePage] = useState<string>('gcse')

  const renderSection = () => {
    switch (activePage) {
      case 'gcse':
        return <GcseSection />
      case 'arithmetic':
        return <ArithmeticSection />
      case 'iq':
        return <IqSection />
      default:
        return <GcseSection />
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#08090E',
      }}
    >
      <Sidebar active={activePage} onNavigate={setActivePage} />
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: '100vh',
        }}
      >
        {renderSection()}
      </main>
    </div>
  )
}
