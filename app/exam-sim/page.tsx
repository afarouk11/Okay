import type { Metadata } from 'next'
import ExamSimClient from './ExamSimClient'

export const metadata: Metadata = {
  title: 'Exam Simulator',
}

export default function ExamSimPage() {
  return <ExamSimClient />
}
