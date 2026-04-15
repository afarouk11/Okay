import { Metadata } from 'next'
import ArithmeticClient from './ArithmeticClient'

export const metadata: Metadata = { title: 'Arithmetic & SATs — Jarvis' }

export default function ArithmeticPage() {
  return <ArithmeticClient />
}
