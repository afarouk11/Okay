import { Metadata } from 'next'
import ChatPageClient from './ChatPageClient'

export const metadata: Metadata = {
  title: 'Chat with Jarvis',
}

export default function ChatPage() {
  return <ChatPageClient />
}
