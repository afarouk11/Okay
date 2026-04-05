import type { Metadata } from 'next'
import HomeClient from './HomeClient'
import { FAQ_ITEMS } from './home-data'

const JSON_LD = JSON.stringify([
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
])

export const metadata: Metadata = {
  metadataBase: new URL('https://synaptiq.co.uk'),
  title: 'Synaptiq — AI A-Level Maths Tutor | AQA, Edexcel, OCR',
  description:
    "The UK's most focused AI tutor for A-Level Maths. Step-by-step working, mark-scheme-aligned answers, and personalised revision for AQA, Edexcel, OCR and WJEC. Start your 7-day free trial.",
  keywords: [
    'AI tutor', 'A-Level Maths', 'AQA', 'Edexcel', 'OCR', 'WJEC',
    'mark scheme', 'personalised learning', 'A-Level revision', 'UK students',
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
}

export default function HomePage() {
  return (
    <>
      {/* Plain server-rendered script tag for JSON-LD — no JS execution needed */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON_LD }}
      />
      <HomeClient />
    </>
  )
}


