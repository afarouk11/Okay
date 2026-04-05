import type { Metadata } from 'next'
import HomeClient from './HomeClient'

const FAQ_ITEMS = [
  {
    q: 'Is there actually a free trial? Do I need a card?',
    a: 'Yes — 7 days completely free. Your card is stored securely via Stripe but not charged until the trial ends. Cancel any time with one click. No questions asked.',
  },
  {
    q: 'How is Synaptiq different from ChatGPT?',
    a: 'ChatGPT is a general assistant. Synaptiq is trained specifically on A-Level Maths curricula — it knows AQA, Edexcel, OCR and WJEC mark schemes, shows working exactly how examiners expect it, and tracks your progress over time.',
  },
  {
    q: 'Which exam boards does Synaptiq cover?',
    a: 'AQA, Edexcel, OCR, and WJEC — all fully supported. You set your exam board during signup and every answer is aligned to that board\'s mark scheme style.',
  },
  {
    q: 'Can I use Synaptiq for both Year 12 and Year 13?',
    a: 'Yes. The full content library covers Pure 1 & 2, Statistics Y1 & Y2, and Mechanics Y1 & Y2 — so whether you\'re starting AS or finishing A2, every topic is covered.',
  },
  {
    q: 'What if I get the same question wrong repeatedly?',
    a: 'Synaptiq tracks your weak spots and surfaces them through the spaced-repetition flashcard system. The more you practice, the smarter your personalised revision plan becomes.',
  },
  {
    q: 'Is Synaptiq suitable if I have ADHD, dyslexia, or dyscalculia?',
    a: 'Yes — these are first-class features, not afterthoughts. ADHD mode breaks responses into shorter, focused steps. Dyslexia mode uses Lexend font with increased spacing. Dyscalculia mode adds colour-coded working and visual number lines.',
  },
  {
    q: 'How much does it cost after the trial?',
    a: '£35/month (about £1.17/day), or £199/year (saving £221 — about £16.58/month). For context, the average A-Level Maths tutor on Tutorful charges £41.59/hour — Synaptiq gives you unlimited 24/7 access for less than the cost of a single tutoring session per month.',
  },
  {
    q: 'Can parents see how their child is progressing?',
    a: 'Yes. Students can open the Parent View from their dashboard at any time and email a progress report directly to a parent or guardian. The report includes study streak, questions answered, XP earned, and the specific topics needing most attention — no account needed for the parent.',
  },
  {
    q: 'Can my school or college get Synaptiq?',
    a: 'Yes. We offer custom pricing for schools, sixth forms, and tuition centres with whole-class accounts, teacher dashboards, and invoice billing. Email schools@synaptiqai.co.uk or click "Book a Demo" on the pricing section.',
  },
]

export const metadata: Metadata = {
  metadataBase: new URL('https://synaptiq.co.uk'),
  title: 'Synaptiq — AI A-Level Maths Tutor | AQA, Edexcel, OCR',
  description:
    'The UK\'s most focused AI tutor for A-Level Maths. Step-by-step working, mark-scheme-aligned answers, and personalised revision for AQA, Edexcel, OCR and WJEC. Start your 7-day free trial.',
  keywords: [
    'AI tutor',
    'A-Level Maths',
    'AQA',
    'Edexcel',
    'OCR',
    'WJEC',
    'mark scheme',
    'personalised learning',
    'A-Level revision',
    'UK students',
  ],
  alternates: { canonical: 'https://synaptiq.co.uk' },
  openGraph: {
    title: 'Synaptiq — AI A-Level Maths Tutor',
    description:
      'Step-by-step working, mark-scheme-aligned answers, and personalised revision for every UK exam board.',
    type: 'website',
    url: 'https://synaptiq.co.uk',
    images: [{ url: '/og-image.svg', width: 1200, height: 630, alt: 'Synaptiq — AI A-Level Maths Tutor' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Synaptiq — AI A-Level Maths Tutor',
    description: 'The only AI tutor that knows your exact mark scheme. Start free.',
    images: ['/og-image.svg'],
  },
  other: {
    'script:ld+json': JSON.stringify([
      {
        '@context': 'https://schema.org',
        '@type': 'EducationalOrganization',
        name: 'Synaptiq',
        url: 'https://synaptiq.co.uk',
        description:
          'AI-powered A-Level Maths tutoring platform aligned to AQA, Edexcel, OCR and WJEC mark schemes.',
        sameAs: [
          'https://twitter.com/synaptiqai',
          'https://instagram.com/synaptiqai',
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ]),
  },
}

export default function HomePage() {
  return <HomeClient />
}

