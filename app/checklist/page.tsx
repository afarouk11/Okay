import type { Metadata } from 'next'
import { Suspense } from 'react'
import ChecklistClient from './ChecklistClient'

export const metadata: Metadata = { title: 'Topic Revision Checklist' }

export default function ChecklistPage() {
  return (
    <Suspense fallback={null}>
      <ChecklistClient />
    </Suspense>
  )
}
