export type LegacyRouteResolution =
  | { kind: 'redirect'; destination: string }

const REDIRECTS: Record<string, string> = {
  index: '/',
  home: '/dashboard',
  dashboard: '/dashboard',
  tutor: '/chat',
  chat: '/chat',
  jarvis: '/jarvis',
  content: '/lessons',
  lessons: '/lessons',
  video: '/lessons',
  examples: '/lessons',
  questions: '/questions',
  papers: '/papers',
  progress: '/dashboard',
  photo: '/chat',
  flashcards: '/study?tab=flashcards',
  blitz: '/study?tab=blitz',
  checklist: '/study?tab=checklist',
  goals: '/plan',
  plan: '/plan',
  timetable: '/plan',
  strengths: '/predict',
  exams: '/predict',
  predict: '/predict',
  grade: '/predict',
  diagnostic: '/predict',
  notes: '/notes',
  bookmarks: '/notes',
  mistakes: '/notes',
  mood: '/wellbeing',
  pomodoro: '/wellbeing?tab=pomodoro',
  assignments: '/plan',
  leaderboard: '/dashboard',
  achievements: '/dashboard',
  a11y: '/settings',
  settings: '/settings',
  admin: '/admin',
  parent: '/parent',
  schools: '/schools',
  pricing: '/pricing',
  contact: '/contact',
  privacy: '/privacy',
  'privacy-policy': '/privacy',
  terms: '/terms',
  cookies: '/cookies',
  'reset-password': '/reset-password',
  resources: '/resources',
  formulas: '/formulas',
  glossary: '/formulas?tab=glossary',
  calculator: '/formulas?tab=calculator',
  mindmap: '/mindmap',
  'integration-by-parts': '/integration-by-parts',
  markscheme: '/resources?tab=markscheme',
  cmdwords: '/formulas?tab=command-words',
  'command-words': '/formulas?tab=command-words',
  essay: '/work-checker',
  'work-checker': '/work-checker',
  wellbeing: '/wellbeing',
  'exam-sim': '/exam-sim',
  'kids-gcse': '/parent',
  'kids-arithmetic': '/parent',
  'kids-iq': '/parent',
}

export function getLegacyRoute(slug: string): LegacyRouteResolution | null {
  const normalized = String(slug || '').trim().toLowerCase()
  if (!normalized) return null

  const canonicalSlug = normalized.replace(/\.html?$/, '')

  if (REDIRECTS[canonicalSlug]) {
    return { kind: 'redirect', destination: REDIRECTS[canonicalSlug] }
  }

  return null
}
