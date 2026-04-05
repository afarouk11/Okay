import { Metadata } from 'next'
import PlanPageClient from './PlanPageClient'

export const metadata: Metadata = {
  title: 'Daily Plan',
}

export default function PlanPage() {
  return <PlanPageClient />
}
