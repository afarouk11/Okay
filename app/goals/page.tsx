import type { Metadata } from 'next'
import { Suspense } from 'react'
import GoalsClient from './GoalsClient'

export const metadata: Metadata = { title: 'Daily Goals' }

export default function GoalsPage() {
  return (
    <Suspense fallback={null}>
      <GoalsClient />
    </Suspense>
  )
}
