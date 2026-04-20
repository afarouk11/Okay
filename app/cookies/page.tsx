import { Metadata } from 'next'
import Link from 'next/link'
import { Zap, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How Synapnode uses cookies and how to manage them.',
  openGraph: { title: 'Cookie Policy | Synapnode', description: 'How Synapnode uses cookies.', type: 'website' },
  twitter: { card: 'summary', title: 'Cookies | Synapnode', description: 'How Synapnode uses cookies.' },
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0B0F14', color: '#E2E8F0' }}>
      <nav
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
        style={{ background: 'rgba(11,15,20,0.92)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#4F8CFF,#22C55E)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-white">Synapnode</span>
        </Link>
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm no-underline" style={{ color: '#9AA4AF' }}>
          <ArrowLeft className="w-4 h-4" />
          Back to app
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#F0EEF8' }}>Cookie Policy</h1>
        <p className="text-sm mb-10" style={{ color: '#6B7394' }}>Last updated: January 2025</p>

        <Section title="What Are Cookies?">
          <p>Cookies are small text files stored on your device when you visit a website. They help us remember your preferences and keep you logged in.</p>
        </Section>

        <Section title="Essential Cookies (Always Active)">
          <p>These cookies are required for the platform to function. They cannot be disabled.</p>
          <div className="mt-3 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <th className="text-left p-3 font-medium" style={{ color: '#F0EEF8' }}>Cookie</th>
                  <th className="text-left p-3 font-medium" style={{ color: '#F0EEF8' }}>Purpose</th>
                  <th className="text-left p-3 font-medium" style={{ color: '#F0EEF8' }}>Duration</th>
                </tr>
              </thead>
              <tbody style={{ color: '#9AA4AF' }}>
                <tr className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <td className="p-3 font-mono">sb-auth-token</td>
                  <td className="p-3">Supabase authentication session</td>
                  <td className="p-3">1 week</td>
                </tr>
                <tr className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <td className="p-3 font-mono">synaptiq_prefs</td>
                  <td className="p-3">User preferences (theme, accessibility)</td>
                  <td className="p-3">1 year</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Analytics Cookies (Optional)">
          <p>These help us understand how users interact with the platform so we can improve it. All data is anonymised.</p>
          <div className="mt-3 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <th className="text-left p-3 font-medium" style={{ color: '#F0EEF8' }}>Cookie</th>
                  <th className="text-left p-3 font-medium" style={{ color: '#F0EEF8' }}>Purpose</th>
                  <th className="text-left p-3 font-medium" style={{ color: '#F0EEF8' }}>Duration</th>
                </tr>
              </thead>
              <tbody style={{ color: '#9AA4AF' }}>
                <tr className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <td className="p-3 font-mono">_synaptiq_session</td>
                  <td className="p-3">Anonymised page visit tracking</td>
                  <td className="p-3">30 days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Managing Your Cookies">
          <p>You can manage your cookie preferences in three ways:</p>
          <ul>
            <li>On your first visit, a consent banner will appear</li>
            <li>Via <strong>Settings → Privacy</strong> at any time</li>
            <li>Through your browser settings (note: disabling essential cookies will break login)</li>
          </ul>
        </Section>

        <Section title="Third-Party Cookies">
          <p>We do not use advertising or social media tracking cookies. Third-party service providers (Supabase, Vercel) may set their own technical cookies as part of delivering the service.</p>
        </Section>

        <Section title="Contact">
          <p>Questions about cookies? Email <a href="mailto:privacy@synaptiqai.co.uk" className="text-blue-400 hover:underline">privacy@synaptiqai.co.uk</a></p>
        </Section>
      </main>

      <Footer />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3" style={{ color: '#F0EEF8' }}>{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#9AA4AF' }}>
        {children}
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t py-8 mt-4" style={{ borderColor: 'rgba(255,255,255,0.06)', color: '#6B7394' }}>
      <div className="max-w-3xl mx-auto px-6 flex flex-wrap gap-4 text-xs">
        <span>© {new Date().getFullYear()} Synapnode Ltd</span>
        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
        <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
        <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
      </div>
    </footer>
  )
}
