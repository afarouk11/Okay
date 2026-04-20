'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function ConditionalSiteFooter() {
  const pathname = usePathname()
  // The homepage has its own branded footer — skip the global one there
  if (pathname === '/') return null

  return (
    <footer
      className="border-t py-5"
      style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(11,15,20,0.6)' }}
    >
      <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs" style={{ color: '#6B7394' }}>© {new Date().getFullYear()} Synapnode Ltd</span>
        <nav className="flex flex-wrap gap-4">
          {[
            { href: '/privacy',  label: 'Privacy'  },
            { href: '/terms',    label: 'Terms'    },
            { href: '/cookies',  label: 'Cookies'  },
            { href: '/contact',  label: 'Contact'  },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs transition-colors hover:text-white"
              style={{ color: '#6B7394' }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
