import type { Metadata } from 'next'
import { Suspense } from 'react'
import BlitzClient from './BlitzClient'

export const metadata: Metadata = { title: 'Quick Blitz' }

export default function BlitzPage() {
  return (
    <Suspense fallback={null}>
      <BlitzClient />
    </Suspense>
  )
}
