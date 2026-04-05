import type { Metadata } from 'next'
import ContactClient from './ContactClient'

export const metadata: Metadata = {
  title: 'Contact & Support',
  description: 'Get in touch with the Synaptiq team. Support, school partnerships, and general enquiries for our A-Level Maths AI tutoring platform.',
  openGraph: {
    title: 'Contact & Support — Synaptiq',
    description: 'Get in touch with the Synaptiq team.',
    type: 'website',
  },
}

export default function ContactPage() {
  return <ContactClient />
}
