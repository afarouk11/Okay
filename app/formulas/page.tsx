import type { Metadata } from 'next'
import { Suspense } from 'react'
import FormulaToolsClient from './FormulaToolsClient'

export const metadata: Metadata = {
  title: 'Reference Tools',
}

export default function FormulasPage() {
  return (
    <Suspense fallback={null}>
      <FormulaToolsClient />
    </Suspense>
  )
}
