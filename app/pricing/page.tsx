import { Metadata } from 'next'
import PricingClient from './PricingClient'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Start free, upgrade when ready. Synapnode Student Plan — unlimited AI tutoring, all lessons, and personalised revision for £40/month.',
  alternates: { canonical: 'https://synaptiqai.co.uk/pricing' },
  openGraph: {
    title: 'Pricing | Synapnode',
    description: 'Start free. Unlimited AI tutoring for A-Level Maths from £40/month.',
    type: 'website',
    url: 'https://synaptiqai.co.uk/pricing',
  },
  twitter: { card: 'summary_large_image', title: 'Pricing | Synapnode', description: 'Unlimited AI A-Level Maths tutoring from £40/month.' },
}

export default function PricingPage() {
  return <PricingClient />
}
