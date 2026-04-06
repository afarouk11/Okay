import Link from 'next/link'

const BG = '#0B0F14'
const PRIMARY = '#4F8CFF'
const GOLD = '#C9A84C'
const SURFACE = '#131920'
const BORDER = '#1e2a38'
const TEXT_MUTED = '#8899aa'

export default function SchoolsClient() {
  return (
    <div style={{ backgroundColor: BG, color: '#e8edf2', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: BG, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <Link href="/" style={{ fontSize: 22, fontWeight: 700, color: PRIMARY, textDecoration: 'none', letterSpacing: '-0.5px' }}>
            Synaptiq
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <Link href="/pricing" style={{ color: TEXT_MUTED, textDecoration: 'none', fontSize: 15, fontWeight: 500 }} className="hover:text-white transition-colors">
              For Students
            </Link>
            <Link href="/contact" style={{ color: TEXT_MUTED, textDecoration: 'none', fontSize: 15, fontWeight: 500 }} className="hover:text-white transition-colors">
              Contact
            </Link>
            <Link
              href="/contact"
              style={{
                backgroundColor: GOLD,
                color: '#0B0F14',
                padding: '9px 20px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.2px',
              }}
              className="hover:opacity-90 transition-opacity"
            >
              Request a Demo
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 60px' }}>
        <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
          <span
            style={{
              display: 'inline-block',
              backgroundColor: `${GOLD}22`,
              color: GOLD,
              border: `1px solid ${GOLD}44`,
              borderRadius: 100,
              padding: '5px 16px',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.5px',
              marginBottom: 24,
              textTransform: 'uppercase',
            }}
          >
            For Schools &amp; Teachers
          </span>

          <h1 style={{ fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 22, letterSpacing: '-1px' }}>
            AI-Powered Maths Tutoring{' '}
            <span style={{ color: PRIMARY }}>for Every Student</span>
          </h1>

          <p style={{ fontSize: 19, color: TEXT_MUTED, lineHeight: 1.7, marginBottom: 36, maxWidth: 640, margin: '0 auto 36px' }}>
            Give your students a personalised AI tutor. Track their progress in real time. Unlock school-wide improvement with one site licence.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 52 }}>
            <Link
              href="/contact"
              style={{
                backgroundColor: GOLD,
                color: '#0B0F14',
                padding: '14px 32px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 16,
                fontWeight: 700,
              }}
              className="hover:opacity-90 transition-opacity"
            >
              Request a Demo →
            </Link>
            <Link
              href="/pricing"
              style={{
                backgroundColor: 'transparent',
                color: '#e8edf2',
                padding: '14px 32px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 16,
                fontWeight: 600,
                border: `1.5px solid ${BORDER}`,
              }}
              className="hover:border-blue-500 transition-colors"
            >
              View Student Pricing →
            </Link>
          </div>

          {/* Stats bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 0,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: SURFACE,
            }}
          >
            {['4 Exam Boards', 'A-Level Pure, Stats & Mechanics', 'Real-Time Progress', 'Site Licence'].map((stat, i, arr) => (
              <div
                key={stat}
                style={{
                  padding: '16px 24px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: TEXT_MUTED,
                  borderRight: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
                  letterSpacing: '0.3px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ color: GOLD, marginRight: 6 }}>✓</span>
                {stat}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 48, letterSpacing: '-0.5px' }}>
          Everything a school needs
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {[
            {
              icon: '🎯',
              title: 'Teacher Assignment Dashboard',
              body: 'Set homework on any maths topic. Jarvis automatically creates a tailored AI session for each student. See completion and accuracy at a glance.',
            },
            {
              icon: '📊',
              title: 'Real-Time Progress Tracking',
              body: "Live dashboards show topic mastery, accuracy trends, and time spent per student. Identify who's struggling before exam season.",
            },
            {
              icon: '🏫',
              title: 'Simple Site Licensing',
              body: 'One annual fee covers every student in your school. No per-seat counting, no surprise bills. Includes all A-Level topics across AQA, Edexcel, OCR and WJEC.',
            },
            {
              icon: '🏡',
              title: 'Homeschool & Tutors',
              body: 'Running a homeschool group or private tuition practice? Our flexible plans scale from 1 student to 500.',
            },
          ].map((card) => (
            <div
              key={card.title}
              style={{
                backgroundColor: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: '28px 24px',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 14 }}>{card.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: '#e8edf2' }}>{card.title}</h3>
              <p style={{ fontSize: 14, color: TEXT_MUTED, lineHeight: 1.65 }}>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ backgroundColor: SURFACE, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '72px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 56, letterSpacing: '-0.5px' }}>
            How it works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
            {[
              {
                step: '1',
                title: 'Teacher Assigns',
                body: 'Set a topic or past paper in seconds from the teacher dashboard',
              },
              {
                step: '2',
                title: 'Jarvis Tutors',
                body: 'Students get a personalised AI session that adapts to their level',
              },
              {
                step: '3',
                title: 'You See Results',
                body: 'Track completion, accuracy, and mastery in your teacher view',
              },
            ].map((item) => (
              <div key={item.step} style={{ textAlign: 'center', padding: '0 12px' }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    backgroundColor: `${PRIMARY}22`,
                    border: `2px solid ${PRIMARY}55`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px',
                    fontSize: 20,
                    fontWeight: 800,
                    color: PRIMARY,
                  }}
                >
                  {item.step}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div
          style={{
            backgroundColor: SURFACE,
            border: `1px solid ${BORDER}`,
            borderLeft: `4px solid ${GOLD}`,
            borderRadius: 14,
            padding: '40px 44px',
          }}
        >
          <p style={{ fontSize: 19, color: '#cdd5e0', lineHeight: 1.75, fontStyle: 'italic', marginBottom: 24 }}>
            &ldquo;Our Year 12s are spending twice as long on maths revision since we introduced Jarvis. The real-time tracking lets me see exactly who needs extra support before the mock exams.&rdquo;
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: GOLD, letterSpacing: '0.3px' }}>
            — Head of Maths, UK Grammar School
          </p>
        </div>
      </section>

      {/* Pricing CTA */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px 80px' }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${SURFACE} 0%, #0f1821 100%)`,
            border: `1px solid ${GOLD}44`,
            borderRadius: 18,
            padding: '52px 44px',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 14, letterSpacing: '-0.5px' }}>
            Start with a free pilot
          </h2>
          <p style={{ fontSize: 16, color: TEXT_MUTED, marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
            School pricing starts with a free pilot for your department. No contracts, no risk.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/contact"
              style={{
                backgroundColor: GOLD,
                color: '#0B0F14',
                padding: '14px 32px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 15,
                fontWeight: 700,
              }}
              className="hover:opacity-90 transition-opacity"
            >
              Request a Demo
            </Link>
            <Link
              href="/pricing"
              style={{
                backgroundColor: 'transparent',
                color: '#e8edf2',
                padding: '14px 32px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 15,
                fontWeight: 600,
                border: `1.5px solid ${BORDER}`,
              }}
              className="hover:border-blue-500 transition-colors"
            >
              See Student Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, backgroundColor: SURFACE }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 700, color: PRIMARY, textDecoration: 'none' }}>
            Synaptiq
          </Link>
          <nav style={{ display: 'flex', gap: 24 }}>
            {[
              { label: 'Home', href: '/' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'Contact', href: '/contact' },
            ].map((link) => (
              <Link key={link.href} href={link.href} style={{ color: TEXT_MUTED, textDecoration: 'none', fontSize: 14 }} className="hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
          <p style={{ color: TEXT_MUTED, fontSize: 13 }}>© 2026 Synaptiq</p>
        </div>
      </footer>
    </div>
  )
}
