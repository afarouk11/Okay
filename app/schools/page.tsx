import type { Metadata } from 'next'
import SchoolsClient from './SchoolsClient'

export const metadata: Metadata = {
  title: 'Synapnode for Schools',
  description: 'AI-powered A-Level Maths tutoring for every student. Site licences, teacher dashboards, and real-time progress tracking.',
  openGraph: {
    title: 'Synapnode for Schools — AI Maths for Every Student',
    description: 'Site licences, teacher assignments, and AI tutoring that adapts to every student.',
    type: 'website',
  },
}

export default function SchoolsPage() {
  return <SchoolsClient />
}
