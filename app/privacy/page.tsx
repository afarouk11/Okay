import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How we collect, use, and protect your data on Synaptiq\'s A-Level Maths AI tutoring platform.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Privacy Policy — Synaptiq',
    description: 'How we collect, use, and protect your data on Synaptiq\'s A-Level Maths AI tutoring platform.',
    type: 'website',
  },
}

export default function PrivacyPage() {
  return (
    <div style={{ background: '#08090E', color: '#E8F0FF', minHeight: '100vh', fontFamily: '\'DM Sans\', system-ui, sans-serif', lineHeight: 1.7 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
        <Link href="/" style={{ display: 'inline-block', fontWeight: 800, fontSize: '1.3rem', color: '#C9A84C', textDecoration: 'none', marginBottom: '2.5rem' }}>
          Synaptiq
        </Link>
        <h1 style={{ fontFamily: '\'Syne\', sans-serif', fontSize: '2rem', fontWeight: 800, marginBottom: '0.4rem' }}>Privacy Policy</h1>
        <p style={{ color: '#6B7394', fontSize: '0.85rem', marginBottom: '2rem' }}>Last updated: 1 March 2026 · Synaptiq Ltd</p>

        <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
          <strong>Plain English summary:</strong> We collect only what we need to run the platform. We never sell your data. We take extra care with students under 18. You can delete your account and all your data at any time.
        </div>

        <Section title="1. Who We Are">
          <p>Synaptiq (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is an educational technology platform operated by Synaptiq Ltd, registered in England and Wales. Our platform is available at synaptiqai.co.uk and related domains.</p>
          <p>We are the Data Controller for personal data collected through our platform. For data protection queries, contact us at: <a href="mailto:privacy@synaptiqai.co.uk" style={{ color: '#C9A84C' }}>privacy@synaptiqai.co.uk</a></p>
        </Section>

        <Section title="2. Data We Collect">
          <p>We collect the following categories of personal data:</p>
          <ul>
            <li><strong>Account data:</strong> Name, email address, password (stored as a secure hash), subscription plan</li>
            <li><strong>Learning data:</strong> Questions asked, subjects studied, practice scores, flashcards, notes, essay submissions</li>
            <li><strong>Usage data:</strong> Pages visited, features used, session duration, device type, browser type</li>
            <li><strong>Payment data:</strong> Handled entirely by Stripe — we never see or store card numbers</li>
            <li><strong>Communications:</strong> Emails you send us for support purposes</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Data">
          <ul>
            <li>To provide and improve the Synaptiq platform</li>
            <li>To personalise your learning experience</li>
            <li>To send you progress reports and study reminders (you can opt out)</li>
            <li>To process payments and manage subscriptions</li>
            <li>To prevent fraud and maintain platform security</li>
            <li>To comply with legal obligations</li>
          </ul>
        </Section>

        <Section title="4. Children's Privacy (Under 18)">
          <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
            <p>Synaptiq is designed for students, including those under 18. We take this responsibility seriously.</p>
            <ul>
              <li>Users under 13 require verifiable parental consent before creating an account</li>
              <li>We do not use data from under-18 users for advertising</li>
              <li>We do not share under-18 data with third parties except as required to operate the service</li>
              <li>Parents and guardians can request deletion of their child&apos;s data at any time by emailing <a href="mailto:privacy@synaptiqai.co.uk" style={{ color: '#C9A84C' }}>privacy@synaptiqai.co.uk</a></li>
              <li>We comply with the UK Children&apos;s Code (Age Appropriate Design Code)</li>
            </ul>
          </div>
        </Section>

        <Section title="5. Legal Basis for Processing (UK GDPR)">
          <ul>
            <li><strong>Contract performance:</strong> Processing necessary to provide the service you signed up for</li>
            <li><strong>Legitimate interests:</strong> Improving our platform, preventing fraud, sending service communications</li>
            <li><strong>Consent:</strong> Marketing emails and optional data uses — you can withdraw consent at any time</li>
            <li><strong>Legal obligation:</strong> Where we are required to process data by law</li>
          </ul>
        </Section>

        <Section title="6. Data Sharing">
          <p>We share data with the following third parties only as necessary to operate the service:</p>
          <ul>
            <li><strong>Supabase:</strong> Database and authentication (servers in EU)</li>
            <li><strong>Anthropic:</strong> AI processing for tutoring features (your questions are processed but not stored by Anthropic beyond your session)</li>
            <li><strong>Stripe:</strong> Payment processing (PCI DSS compliant)</li>
            <li><strong>Vercel:</strong> Hosting (servers in EU/UK)</li>
            <li><strong>Resend:</strong> Email delivery</li>
          </ul>
          <p>We do not sell, rent, or trade your personal data to any third party for commercial purposes.</p>
        </Section>

        <Section title="7. Data Retention">
          <ul>
            <li>Active account data: Retained while your account is active</li>
            <li>Learning data: Retained for 3 years after your last login, then deleted</li>
            <li>Payment records: Retained for 7 years (legal requirement)</li>
            <li>Deleted accounts: All personal data deleted within 30 days of account deletion request</li>
          </ul>
        </Section>

        <Section title="8. Your Rights (UK GDPR)">
          <p>You have the following rights regarding your personal data:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of all data we hold about you</li>
            <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
            <li><strong>Erasure:</strong> Request deletion of your data (&ldquo;right to be forgotten&rdquo;)</li>
            <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
            <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
            <li><strong>Restriction:</strong> Request that we limit processing of your data</li>
          </ul>
          <p>To exercise any of these rights, email <a href="mailto:privacy@synaptiqai.co.uk" style={{ color: '#C9A84C' }}>privacy@synaptiqai.co.uk</a>. We will respond within 30 days. You also have the right to lodge a complaint with the ICO (ico.org.uk).</p>
        </Section>

        <Section title="9. Security">
          <p>We implement appropriate technical and organisational measures to protect your data, including: encrypted connections (HTTPS), hashed passwords, role-based access controls, and regular security reviews. However, no system is 100% secure — please use a strong, unique password.</p>
        </Section>

        <Section title="10. Cookies">
          <p>We use cookies to keep you logged in and to understand how the platform is used. See our <Link href="/cookies" style={{ color: '#C9A84C' }}>Cookie Policy</Link> for details.</p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>We may update this policy. We will notify you by email of material changes at least 30 days before they take effect.</p>
        </Section>

        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
          <Link href="/" style={{ color: '#C9A84C', textDecoration: 'none' }}>← Back</Link>
          <Link href="/terms" style={{ color: '#6B7394', textDecoration: 'none' }}>Terms &amp; Conditions</Link>
          <Link href="/cookies" style={{ color: '#6B7394', textDecoration: 'none' }}>Cookie Policy</Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontFamily: '\'Syne\', sans-serif', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#E8F0FF' }}>{title}</h2>
      <div style={{ color: '#A8B8CC' }}>
        {children}
      </div>
    </div>
  )
}
