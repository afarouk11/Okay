import type { Metadata } from 'next'
import ParentPageClient from './ParentPageClient'

export const metadata: Metadata = {
  title: 'Parent Dashboard',
  description: "Monitor your child's learning progress on Synaptiq.",
}

export default function ParentPage() {
  return <ParentPageClient />
}
