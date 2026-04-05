import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Synaptiq Kids',
  description: 'Kids & Family maths education platform with AI-powered learning tools',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}
