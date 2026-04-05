import type { Metadata } from 'next'
import './globals.css'
import ChatWindow from '@/components/ChatWindow'

export const metadata: Metadata = {
  title: {
    default: 'Jarvis — AI Learning Platform',
    template: '%s | Jarvis',
  },
  description: 'Your personal AI tutor. Jarvis teaches step-by-step, adapts to your level, and guides you to mastery.',
  keywords: ['AI tutor', 'learning platform', 'A-Level Maths', 'personalised learning'],
  openGraph: {
    title: 'Jarvis — AI Learning Platform',
    description: 'Your personal AI tutor. Premium, intelligent, fast.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
        <ChatWindow />
      </body>
    </html>
  )
}
