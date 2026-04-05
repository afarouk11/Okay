import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Information about the cookies Synaptiq uses on our A-Level Maths AI tutoring platform.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Cookie Policy — Synaptiq',
    description: 'Information about the cookies Synaptiq uses on our A-Level Maths AI tutoring platform.',
    type: 'website',
  },
}

export default function CookiesPage() {
  return (
    <div style={{ background: '#08090E', color: '#E8F0FF', minHeight: '100vh', fontFamily: '\'DM Sans\', system-ui, sans-serif', lineHeight: 1.7 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
        <Link href="/" style={{ display: 'inline-block', fontWeight: 800, fontSize: '1.3rem', color: '#C9A84C', textDecoration: 'none', marginBottom: '2.5rem' }}>
          Synaptiq
        </Link>
        <h1 style={{ fontFamily: '\'Syne\', sans-serif', fontSize: '2rem', fontWeight: 800, marginBottom: '0.4rem' }}>Cookie Policy</h1>
        <p style={{ color: '#6B7394', fontSize: '0.85rem', marginBottom: '2rem' }}>Last updated: 1 March 2026</p>

        <p style={{ color: '#A8B8CC', marginBottom: '2rem' }}>
          This policy explains how Synaptiq uses cookies and similar technologies. We use the minimum number of cookies necessary to run the platform.
        </p>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: '\'Syne\', sans-serif', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#E8F0FF' }}>Essential Cookies (Always Active)</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <Th>Cookie</Th>
                <Th>Purpose</Th>
                <Th>Duration</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td>sb-auth-token</Td>
                <Td>Keeps you logged in (Supabase authentication)</Td>
                <Td>Session / 1 week</Td>
              </tr>
              <tr>
                <Td>synaptiq_prefs</Td>
                <Td>Stores your preferences (dark mode, font size)</Td>
                <Td>1 year</Td>
              </tr>
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: '\'Syne\', sans-serif', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#E8F0FF' }}>Analytics Cookies (Optional)</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <Th>Cookie</Th>
                <Th>Purpose</Th>
                <Th>Duration</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td>_synaptiq_session</Td>
                <Td>Tracks page visits to help us improve the platform. No personal data.</Td>
                <Td>30 days</Td>
              </tr>
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: '\'Syne\', sans-serif', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#E8F0FF' }}>Managing Cookies</h2>
          <p style={{ color: '#A8B8CC' }}>
            You can manage cookie preferences when you first visit the site, or at any time via Settings &rarr; Privacy. You can also clear cookies through your browser settings. Note that disabling essential cookies will prevent you from logging in.
          </p>
        </section>

        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
          <Link href="/" style={{ color: '#C9A84C', textDecoration: 'none' }}>← Back</Link>
          <Link href="/privacy" style={{ color: '#6B7394', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: '#6B7394', textDecoration: 'none' }}>Terms &amp; Conditions</Link>
        </div>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#6B7394', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: '0.6rem 0.75rem', color: '#A8B8CC', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      {children}
    </td>
  )
}
