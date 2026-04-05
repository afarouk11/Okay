import type { Metadata } from 'next'
import NotesClient from './NotesClient'

export const metadata: Metadata = {
  title: 'My Notes',
  description: 'Your personal study notes on Synaptiq.',
}

export default function NotesPage() {
  return <NotesClient />
}
