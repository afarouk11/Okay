import type { Metadata } from 'next'
import './globals.css'
import ChatWindow from '@/components/ChatWindow'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'
import ConditionalSiteFooter from '@/components/ConditionalSiteFooter'

export const metadata: Metadata = {
  title: {
    default: 'Synaptiq — AI Learning Platform',
    template: '%s | Synaptiq',
  },
  description: 'Your personal AI tutor. Synaptiq teaches step-by-step, adapts to your level, and guides you to mastery in A-Level Maths.',
  keywords: ['AI tutor', 'A-Level Maths', 'AQA', 'Edexcel', 'OCR', 'WJEC', 'personalised learning'],
  openGraph: {
    title: 'Synaptiq — AI Learning Platform',
    description: 'Your personal AI tutor. Premium, intelligent, personalised.',
    type: 'website',
    url: 'https://synaptiq.co.uk',
    images: [{ url: '/og-image.svg', width: 1200, height: 630, alt: 'Synaptiq — AI Learning Platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Synaptiq — AI Learning Platform',
    description: 'Your personal AI tutor for A-Level Maths.',
    images: ['/og-image.svg'],
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
        <ServiceWorkerRegistrar />
        <ConditionalSiteFooter />
      </body>
    </html>
  )
}

