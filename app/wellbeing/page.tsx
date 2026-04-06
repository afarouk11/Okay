import type { Metadata } from 'next'
import { Suspense } from 'react'
import WellbeingPageClient from './WellbeingPageClient'

export const metadata: Metadata = {
  title: 'Wellbeing',
}

export default function WellbeingPage() {
  return (
    <Suspense fallback={null}>
      <WellbeingPageClient />
    </Suspense>
  )
}
