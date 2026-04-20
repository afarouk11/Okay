import type { Metadata } from 'next'
import KidsPageClient, { type KidsSection } from './KidsPageClient'

export const metadata: Metadata = {
  title: 'Synapnode Kids',
  description:
    'A family-friendly Synapnode area for GCSE maths, arithmetic drills, and reasoning practice.',
}

function resolveSection(value?: string | string[]): KidsSection {
  const raw = Array.isArray(value) ? value[0] : value

  switch ((raw ?? '').toLowerCase()) {
    case 'arithmetic':
      return 'arithmetic'
    case 'iq':
      return 'iq'
    default:
      return 'gcse'
  }
}

export default async function KidsPage({
  searchParams,
}: {
  searchParams?: Promise<{ section?: string | string[] }>
}) {
  const params = searchParams ? await searchParams : undefined

  return <KidsPageClient initialSection={resolveSection(params?.section)} />
}
