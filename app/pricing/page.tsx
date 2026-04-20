import { Metadata } from 'next'
import PricingClient from './PricingClient'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Start free, upgrade when ready. Synapnode Student Plan — unlimited AI tutoring, all lessons, and personalised revision for £40/month.',
  openGraph: {
    title: 'Pricing | Synapnode',
    description: 'Start free. Unlimited AI tutoring for A-Level Maths from £40/month.',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'Pricing | Synapnode', description: 'Unlimited AI A-Level Maths tutoring from £40/month.' },
}

export default function PricingPage() {
  return <PricingClient />
}
