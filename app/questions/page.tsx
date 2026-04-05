import { Metadata } from 'next'
import QuestionsClient from './QuestionsClient'

export const metadata: Metadata = {
  title: 'Practice Questions',
}

export default function QuestionsPage() {
  return <QuestionsClient />
}
