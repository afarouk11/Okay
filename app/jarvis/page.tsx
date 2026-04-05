import type { Metadata } from 'next'
import JarvisPageClient from './JarvisPageClient'

export const metadata: Metadata = {
  title: 'J.A.R.V.I.S. — AI Maths Assistant',
  description:
    'Talk or type with J.A.R.V.I.S., your A-Level Maths AI assistant. Voice and text chat powered by ElevenLabs and Claude.',
  openGraph: {
    title: 'J.A.R.V.I.S. — AI Maths Assistant | Synaptiq',
    description:
      'Voice and text chat with your personal A-Level Maths AI tutor.',
    type: 'website',
    images: [{ url: '/og-image.svg', width: 1200, height: 630 }],
  },
}

export default function JarvisPage() {
  return <JarvisPageClient />
}
