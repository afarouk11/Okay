import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#03050D',
        card: '#0D1220',
        primary: '#00D4FF',
        accent: '#00FF9D',
        foreground: '#E8F0FF',
        muted: '#5A7499',
        border: 'rgba(0,212,255,0.12)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
        lg: '12px',
      },
      boxShadow: {
        card: '0 8px 32px rgba(0,0,0,0.6)',
        glow: '0 0 40px rgba(0,212,255,0.12)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
