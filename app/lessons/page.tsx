import { Metadata } from 'next'
import LessonsClient from './LessonsClient'

export const metadata: Metadata = {
  title: 'AI Lessons',
}

export default function LessonsPage() {
  return <LessonsClient />
}
