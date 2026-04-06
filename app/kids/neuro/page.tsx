import { Metadata } from 'next'
import NeuroClient from './NeuroClient'

export const metadata: Metadata = { title: 'Neuroplasticity — Jarvis' }

export default function NeuroPage() {
  return <NeuroClient />
}
