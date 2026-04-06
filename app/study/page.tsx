import type { Metadata } from 'next'
import { Suspense } from 'react'
import StudyClient from './StudyClient'

export const metadata: Metadata = {
  title: 'Study Hub',
}

export default function StudyPage() {
  return (
    <Suspense fallback={null}>
      <StudyClient />
    </Suspense>
  )
}
