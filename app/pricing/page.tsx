import { Metadata } from 'next'
import PricingClient from './PricingClient'

export const metadata: Metadata = {
  title: 'Pricing',
}

export default function PricingPage() {
  return <PricingClient />
}
