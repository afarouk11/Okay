import { Metadata } from 'next'
import NotesClient from './NotesClient'

export const metadata: Metadata = {
  title: 'Notes',
  description: 'Capture and revisit your study notes.',
}

export default function NotesPage() {
  return <NotesClient />
}
