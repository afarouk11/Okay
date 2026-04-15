import type { Metadata } from 'next'
import { Suspense } from 'react'
import ExamsClient from './ExamsClient'

export const metadata: Metadata = { title: 'Exam Countdown' }

export default function ExamsPage() {
  return (
    <Suspense fallback={null}>
      <ExamsClient />
    </Suspense>
  )
}
