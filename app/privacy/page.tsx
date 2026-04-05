import { Metadata } from 'next'
import Link from 'next/link'
import { Zap, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Synaptiq collects, uses, and protects your personal data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0B0F14', color: '#E2E8F0' }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
        style={{ background: 'rgba(11,15,20,0.92)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#4F8CFF,#22C55E)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-white">Synaptiq</span>
        </Link>
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm no-underline" style={{ color: '#9AA4AF' }}>
          <ArrowLeft className="w-4 h-4" />
          Back to app
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#F0EEF8' }}>Privacy Policy</h1>
        <p className="text-sm mb-10" style={{ color: '#6B7394' }}>Last updated: January 2025</p>

        <Section title="Who We Are">
          <p>Synaptiq is an AI-powered learning platform for UK students. We are operated by Synaptiq Ltd. If you have any questions about this policy, contact us at <a href="mailto:privacy@synaptiqai.co.uk" className="text-blue-400 hover:underline">privacy@synaptiqai.co.uk</a>.</p>
        </Section>

        <Section title="Data We Collect">
          <ul>
            <li><strong>Account data</strong> — name, email address, hashed password, subscription plan</li>
            <li><strong>Learning data</strong> — questions answered, scores, flashcards, notes, essays, topics studied</li>
            <li><strong>Usage data</strong> — pages visited, features used, session length, device and browser type</li>
            <li><strong>Payment data</strong> — processed via Stripe; we never store your card details</li>
            <li><strong>Communications</strong> — support emails and messages you send us</li>
          </ul>
        </Section>

        <Section title="How We Use Your Data">
          <ul>
            <li>Provide and improve the platform</li>
            <li>Personalise your learning experience</li>
            <li>Send progress reports and notifications (with your consent)</li>
            <li>Process payments and manage your subscription</li>
            <li>Prevent fraud and ensure platform security</li>
            <li>Comply with legal obligations</li>
          </ul>
        </Section>

        <Section title="Children's Privacy">
          <p>Synaptiq is primarily designed for students aged 16 and over. If you are under 13, you must have verifiable parental consent before creating an account. We do not serve advertisements to users under 18 and we do not share under-18 data with third parties except for the service providers listed below. Parents may request deletion of their child&apos;s data by emailing <a href="mailto:privacy@synaptiqai.co.uk" className="text-blue-400 hover:underline">privacy@synaptiqai.co.uk</a>. We comply with the UK Children&apos;s Code.</p>
        </Section>

        <Section title="Legal Basis (UK GDPR)">
          <ul>
            <li><strong>Contract performance</strong> — to deliver the service you signed up for</li>
            <li><strong>Legitimate interests</strong> — platform security, fraud prevention, product improvement</li>
            <li><strong>Consent</strong> — marketing emails and optional analytics (you can withdraw at any time)</li>
            <li><strong>Legal obligation</strong> — financial records, responding to lawful requests</li>
          </ul>
        </Section>

        <Section title="Data Sharing">
          <p>We share data only with the following service providers, each bound by strict data-processing agreements:</p>
          <ul>
            <li><strong>Supabase</strong> — database and authentication (EU/UK servers)</li>
            <li><strong>Anthropic</strong> — AI responses (data used only to fulfil your request, not for training)</li>
            <li><strong>Stripe</strong> — payment processing (PCI DSS compliant)</li>
            <li><strong>Vercel</strong> — hosting and CDN</li>
            <li><strong>Resend</strong> — transactional emails</li>
          </ul>
          <p>We never sell your data.</p>
        </Section>

        <Section title="Data Retention">
          <ul>
            <li><strong>Active accounts</strong> — retained while your account is active</li>
            <li><strong>Learning data</strong> — 3 years after your last login</li>
            <li><strong>Payment records</strong> — 7 years (legal requirement)</li>
            <li><strong>Deleted accounts</strong> — all data purged within 30 days</li>
          </ul>
        </Section>

        <Section title="Your Rights (UK GDPR)">
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access</strong> — request a copy of your data</li>
            <li><strong>Rectification</strong> — correct inaccurate data</li>
            <li><strong>Erasure</strong> — request deletion of your data</li>
            <li><strong>Portability</strong> — receive your data in a machine-readable format</li>
            <li><strong>Objection</strong> — object to processing based on legitimate interests</li>
            <li><strong>Restriction</strong> — request we limit how we process your data</li>
          </ul>
          <p>We respond within 30 days. You may also lodge a complaint with the ICO at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">ico.org.uk</a>.</p>
        </Section>

        <Section title="Cookies">
          <p>We use the following cookies:</p>
          <ul>
            <li><strong>Essential</strong> — login session and security (cannot be disabled)</li>
            <li><strong>Analytics</strong> — optional, anonymised page-visit tracking</li>
            <li><strong>Preferences</strong> — your theme and accessibility settings</li>
          </ul>
          <p>You can manage your cookie preferences at any time in Settings → Privacy.</p>
        </Section>

        <Section title="Security">
          <p>We use HTTPS/TLS encryption, bcrypt password hashing, row-level database security, and conduct regular security audits. No system is 100% secure, but we take industry-standard steps to protect your data.</p>
        </Section>

        <Section title="International Transfers">
          <p>Your data is primarily processed in the UK and EU. Where data is transferred to the US (e.g., Anthropic), we use Standard Contractual Clauses approved by the UK ICO.</p>
        </Section>

        <Section title="Policy Updates">
          <p>We will notify you by email and with a platform notice at least 30 days before any material changes to this policy.</p>
        </Section>

        <Section title="Contact">
          <p>For any privacy-related queries: <a href="mailto:privacy@synaptiqai.co.uk" className="text-blue-400 hover:underline">privacy@synaptiqai.co.uk</a></p>
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
        <span>© {new Date().getFullYear()} Synaptiq Ltd</span>
        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
        <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
        <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
      </div>
    </footer>
  )
}
