import { notFound, redirect } from 'next/navigation'
import { getLegacyRoute } from '@/lib/legacyRoutes'

export default async function LegacyAliasPage({
  params,
}: {
  params: Promise<{ legacySlug: string }>
}) {
  const { legacySlug } = await params
  const resolution = getLegacyRoute(legacySlug)

  if (!resolution) {
    notFound()
  }

  if (resolution.kind === 'redirect') {
    redirect(resolution.destination)
  }

  notFound()
}
