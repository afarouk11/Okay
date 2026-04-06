import { describe, it, expect } from 'vitest'
import { getLegacyRoute } from '../../lib/legacyRoutes.ts'

describe('getLegacyRoute', () => {
  it('redirects old dashboard aliases to their canonical Next.js pages', () => {
    expect(getLegacyRoute('flashcards')).toEqual({ kind: 'redirect', destination: '/study?tab=flashcards' })
    expect(getLegacyRoute('diagnostic')).toEqual({ kind: 'redirect', destination: '/predict' })
    expect(getLegacyRoute('progress')).toEqual({ kind: 'redirect', destination: '/dashboard' })
  })

  it('redirects remaining legacy tools to their migrated Next.js routes', () => {
    expect(getLegacyRoute('formulas')).toEqual({ kind: 'redirect', destination: '/formulas' })
    expect(getLegacyRoute('glossary')).toEqual({ kind: 'redirect', destination: '/formulas?tab=glossary' })
    expect(getLegacyRoute('calculator')).toEqual({ kind: 'redirect', destination: '/formulas?tab=calculator' })
    expect(getLegacyRoute('cmdwords')).toEqual({ kind: 'redirect', destination: '/formulas?tab=command-words' })
    expect(getLegacyRoute('resources')).toEqual({ kind: 'redirect', destination: '/resources' })
    expect(getLegacyRoute('markscheme')).toEqual({ kind: 'redirect', destination: '/resources?tab=markscheme' })
    expect(getLegacyRoute('mindmap')).toEqual({ kind: 'redirect', destination: '/mindmap' })
    expect(getLegacyRoute('essay')).toEqual({ kind: 'redirect', destination: '/work-checker' })
    expect(getLegacyRoute('wellbeing')).toEqual({ kind: 'redirect', destination: '/wellbeing' })
    expect(getLegacyRoute('exam-sim')).toEqual({ kind: 'redirect', destination: '/exam-sim' })
    expect(getLegacyRoute('settings')).toEqual({ kind: 'redirect', destination: '/settings' })
    expect(getLegacyRoute('timetable')).toEqual({ kind: 'redirect', destination: '/plan' })
    expect(getLegacyRoute('mistakes')).toEqual({ kind: 'redirect', destination: '/notes' })
    expect(getLegacyRoute('admin')).toEqual({ kind: 'redirect', destination: '/admin' })
    expect(getLegacyRoute('kids-gcse')).toEqual({ kind: 'redirect', destination: '/parent' })
    expect(getLegacyRoute('integration-by-parts')).toEqual({ kind: 'redirect', destination: '/integration-by-parts' })
  })

  it('normalizes legacy .html entrypoints to the migrated Next.js routes', () => {
    expect(getLegacyRoute('index.html')).toEqual({ kind: 'redirect', destination: '/' })
    expect(getLegacyRoute('pricing.html')).toEqual({ kind: 'redirect', destination: '/pricing' })
    expect(getLegacyRoute('privacy-policy.html')).toEqual({ kind: 'redirect', destination: '/privacy' })
    expect(getLegacyRoute('  TERMS.HTML  ')).toEqual({ kind: 'redirect', destination: '/terms' })
  })

  it('returns null for unknown slugs', () => {
    expect(getLegacyRoute('definitely-not-a-real-page')).toBeNull()
  })
})
