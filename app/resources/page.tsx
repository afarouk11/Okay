import type { Metadata } from 'next'
import { Suspense } from 'react'
import ResourcesClient from './ResourcesClient'

export const metadata: Metadata = {
  title: 'Resources',
}

export default function ResourcesPage() {
  return (
    <Suspense fallback={null}>
      <ResourcesClient />
    </Suspense>
  )
}
