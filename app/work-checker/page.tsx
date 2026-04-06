import type { Metadata } from 'next'
import WorkCheckerPageClient from './WorkCheckerPageClient'

export const metadata: Metadata = {
  title: 'Work Checker',
}

export default function WorkCheckerPage() {
  return <WorkCheckerPageClient />
}
