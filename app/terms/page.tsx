import { Metadata } from 'next'
import Link from 'next/link'
import { Zap, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Synaptiq terms and conditions of use.',
}

export default function TermsPage() {
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
          <span className="font-bold text-sm text-white">Synaptiq</span>
        </Link>
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm no-underline" style={{ color: '#9AA4AF' }}>
          <ArrowLeft className="w-4 h-4" />
          Back to app
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#F0EEF8' }}>Terms of Service</h1>
        <p className="text-sm mb-10" style={{ color: '#6B7394' }}>Last updated: January 2025</p>

        <Section title="1. Acceptance">
          <p>By accessing or using Synaptiq, you agree to these Terms. If you are under 18, you must have the consent of a parent or guardian. If you do not agree, please do not use the platform.</p>
        </Section>

        <Section title="2. The Service">
          <p>Synaptiq provides AI-powered tutoring, practice questions, essay marking, revision tools, and progress tracking. We reserve the right to modify or suspend features with reasonable notice.</p>
        </Section>

        <Section title="3. Account Registration">
          <ul>
            <li>You must provide accurate information when creating an account</li>
            <li>You are responsible for keeping your password secure</li>
            <li>Minimum age is 13; users under 13 require verifiable parental consent</li>
            <li>One account per person — sharing accounts is not permitted</li>
            <li>We may suspend or terminate accounts that violate these Terms</li>
          </ul>
        </Section>

        <Section title="4. Subscriptions & Payment">
          <ul>
            <li>Subscriptions are billed monthly in advance in GBP (+ VAT where applicable)</li>
            <li>You may cancel at any time; cancellation takes effect at the end of the current billing period</li>
            <li>No partial-month refunds, except where required under UK consumer law</li>
            <li>We will give 30 days&apos; notice of any price changes</li>
            <li>Payments are processed securely by Stripe</li>
          </ul>
        </Section>

        <Section title="5. Acceptable Use">
          <p>You must not:</p>
          <ul>
            <li>Submit AI-generated content as your own work (academic dishonesty)</li>
            <li>Use the platform for illegal, harmful, or offensive purposes</li>
            <li>Reverse-engineer, scrape, or copy the platform or its content</li>
            <li>Share login credentials with others</li>
            <li>Harass or abuse other users or our team</li>
          </ul>
        </Section>

        <Section title="6. AI-Generated Content">
          <p>AI responses may contain errors or inaccuracies. Synaptiq is a study aid — it is not a replacement for professional advice. Always verify AI output for high-stakes decisions. Exam content is guidance only.</p>
        </Section>

        <Section title="7. Intellectual Property">
          <p>Synaptiq owns the platform, code, design, and branding. You own the content you create (notes, essays, flashcards). By using the platform you grant Synaptiq a limited licence to process your content to deliver the service. AI responses are provided for personal educational use only.</p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>To the maximum extent permitted by law, Synaptiq is not liable for indirect or consequential damages. Our total liability in any 12-month period is limited to the amount you paid us in that period. Nothing in these Terms limits our liability for death, personal injury, negligence, or fraud.</p>
        </Section>

        <Section title="9. Consumer Rights">
          <p>Nothing in these Terms affects your statutory rights under the Consumer Rights Act 2015 or any other applicable UK consumer legislation.</p>
        </Section>

        <Section title="10. Termination">
          <p>You can delete your account at any time via Settings. We may terminate your account for breach of these Terms. Data will be deleted in accordance with our <Link href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>.</p>
        </Section>

        <Section title="11. Governing Law">
          <p>These Terms are governed by the laws of England and Wales. Disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
        </Section>

        <Section title="12. Updates">
          <p>We will give 30 days&apos; notice of material changes to these Terms via email and an in-platform notice.</p>
        </Section>

        <Section title="13. Contact">
          <p>For legal queries: <a href="mailto:legal@synaptiqai.co.uk" className="text-blue-400 hover:underline">legal@synaptiqai.co.uk</a></p>
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
