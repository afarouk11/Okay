import type { Metadata } from 'next'
import PapersClient from './PapersClient'

export const metadata: Metadata = {
  title: 'Past Paper Questions',
  description:
    'AI-generated exam-style questions in the exact style of AQA, Edexcel, OCR and WJEC A-Level Maths papers.',
}

export default function PapersPage() {
  return <PapersClient />
}
