import type { Metadata } from 'next'
import { Suspense } from 'react'
import MistakesClient from './MistakesClient'

export const metadata: Metadata = { title: 'Common Mistakes' }

export default function MistakesPage() {
  return (
    <Suspense fallback={null}>
      <MistakesClient />
    </Suspense>
  )
}
