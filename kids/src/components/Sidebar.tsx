'use client'

interface SidebarProps {
  active: string
  onNavigate: (page: string) => void
}

const navItems = [
  { id: 'gcse', icon: '🎓', label: 'GCSE Maths' },
  { id: 'arithmetic', icon: '🔢', label: 'Arithmetic & SATs' },
  { id: 'neuro', icon: '🧠', label: 'Neuroplasticity' },
]

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <aside
      style={{
        width: '220px',
        minHeight: '100vh',
        background: 'rgba(255,255,255,0.02)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '0 20px 32px 20px' }}>
        <span
          style={{
            fontSize: '18px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #00D4FF, #7B40FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.3px',
          }}
        >
          ⚡ Synaptiq Kids
        </span>
      </div>

      {/* Section label */}
      <div
        style={{
          padding: '0 20px 12px 20px',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '1.2px',
          color: 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase',
        }}
      >
        Learning Sections
      </div>

      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px' }}>
        {navItems.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: isActive ? 'rgba(0,212,255,0.08)' : 'transparent',
                borderLeft: isActive ? '3px solid #00D4FF' : '3px solid transparent',
                color: isActive ? '#00D4FF' : 'rgba(255,255,255,0.6)',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s ease',
                textAlign: 'left',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.85)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'
                }
              }}
            >
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          marginTop: 'auto',
          padding: '20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', lineHeight: '1.5' }}>
          Synaptiq Kids v1.0
          <br />
          AI-Powered Learning
        </p>
      </div>
    </aside>
  )
}
