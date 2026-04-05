import type { Metadata } from 'next'
import './globals.css'
import ChatWindow from '@/components/ChatWindow'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'
import Link from 'next/link'

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
        <ServiceWorkerRegistrar />
        <SiteFooter />
      </body>
    </html>
  )
}

function SiteFooter() {
  return (
    <footer
      className="border-t py-5"
      style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(11,15,20,0.6)' }}
    >
      <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs" style={{ color: '#6B7394' }}>© {new Date().getFullYear()} Synaptiq Ltd</span>
        <nav className="flex flex-wrap gap-4">
          {[
            { href: '/privacy',  label: 'Privacy'  },
            { href: '/terms',    label: 'Terms'    },
            { href: '/cookies',  label: 'Cookies'  },
            { href: '/contact',  label: 'Contact'  },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs transition-colors hover:text-white"
              style={{ color: '#6B7394' }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
