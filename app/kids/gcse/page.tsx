import { Metadata } from 'next'
import GcseClient from './GcseClient'

export const metadata: Metadata = { title: 'GCSE Maths — Jarvis' }

export default function GcsePage() {
  return <GcseClient />
}
