import { Metadata } from 'next'
import LessonsClient from './LessonsClient'

export const metadata: Metadata = {
  title: 'AI Lessons',
  description: 'Step-by-step AI-powered lessons for every A-Level Maths topic. AQA, Edexcel, OCR and WJEC — explained clearly, with worked examples.',
  alternates: { canonical: 'https://studiq.org/lessons' },
  openGraph: {
    title: 'AI Lessons | Synapnode',
    description: 'Step-by-step A-Level Maths lessons powered by AI. Every topic, every exam board.',
    type: 'website',
    url: 'https://studiq.org/lessons',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Lessons | Synapnode',
    description: 'Step-by-step A-Level Maths lessons powered by AI.',
  },
}

export default function LessonsPage() {
  return <LessonsClient />
}
