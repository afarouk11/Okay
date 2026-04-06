import type { Metadata } from 'next'
import MindmapClient from './MindmapClient'

export const metadata: Metadata = {
  title: 'Mind Map',
}

export default function MindmapPage() {
  return <MindmapClient />
}
