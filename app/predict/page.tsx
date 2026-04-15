import type { Metadata } from 'next'
import PredictClient from './PredictClient'

export const metadata: Metadata = {
  title: 'Exam Insights',
}

export default function PredictPage() {
  return <PredictClient />
}
