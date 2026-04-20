import type { Metadata } from 'next'
import ParentPageClient from './ParentPageClient'

export const metadata: Metadata = {
  title: 'Parent Dashboard',
  description: "Monitor your child's learning progress on Synapnode.",
}

export default function ParentPage() {
  return <ParentPageClient />
}
