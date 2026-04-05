import { Metadata } from 'next'
import ContactClient from './ContactClient'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the Synaptiq team for support, billing, or school licensing.',
}

export default function ContactPage() {
  return <ContactClient />
}
