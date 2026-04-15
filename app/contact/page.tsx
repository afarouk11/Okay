import { Metadata } from 'next'
import ContactClient from './ContactClient'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the Synaptiq team for support, billing, or school licensing.',
  openGraph: {
    title: 'Contact | Synaptiq',
    description: 'Get in touch with the Synaptiq team for support, billing, or school licensing.',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'Contact | Synaptiq', description: 'Get in touch with the Synaptiq team.' },
}

export default function ContactPage() {
  return <ContactClient />
}
