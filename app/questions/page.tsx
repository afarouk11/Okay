import { Metadata } from 'next'
import QuestionsClient from './QuestionsClient'

export const metadata: Metadata = {
  title: 'Practice Questions',
  description: 'Generate unlimited A-Level Maths practice questions with full mark-scheme solutions. Tailored to AQA, Edexcel, OCR and WJEC.',
  alternates: { canonical: 'https://synaptiqai.co.uk/questions' },
  openGraph: {
    title: 'Practice Questions | Synapnode',
    description: 'Unlimited AI-generated A-Level Maths questions with mark-scheme solutions.',
    type: 'website',
    url: 'https://synaptiqai.co.uk/questions',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Practice Questions | Synapnode',
    description: 'Unlimited AI-generated A-Level Maths questions with mark-scheme solutions.',
  },
}

export default function QuestionsPage() {
  return <QuestionsClient />
}
