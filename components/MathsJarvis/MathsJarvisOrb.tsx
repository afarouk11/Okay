'use client'

import { motion, type TargetAndTransition } from 'framer-motion'

type OrbState = 'LISTENING' | 'THINKING' | 'CHATTING'

interface MathsJarvisOrbProps {
  state: OrbState
  analyserNode?: AnalyserNode | null
}

const STATE_COLORS: Record<OrbState, { inner: string; outer: string; ring: string }> = {
  LISTENING: {
    inner: 'radial-gradient(circle, #00D4FF 0%, #0088CC 50%, transparent 80%)',
    outer: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)',
    ring: 'rgba(0,212,255,0.4)',
  },
  THINKING: {
    inner: 'radial-gradient(circle, #C9A84C 0%, #A07030 50%, transparent 80%)',
    outer: 'radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%)',
    ring: 'rgba(201,168,76,0.4)',
  },
  CHATTING: {
    inner: 'radial-gradient(circle, #00FF9D 0%, #00AA66 50%, transparent 80%)',
    outer: 'radial-gradient(circle, rgba(0,255,157,0.15) 0%, transparent 70%)',
    ring: 'rgba(0,255,157,0.4)',
  },
}

const STATE_ANIMATIONS: Record<OrbState, TargetAndTransition> = {
  LISTENING: {
    scale: [1, 1.06, 1],
    transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
  },
  THINKING: {
    scale: [1, 1.12, 0.95, 1.08, 1],
    rotate: [0, 180, 360],
    transition: { duration: 1.8, repeat: Infinity, ease: 'linear' },
  },
  CHATTING: {
    scale: [1, 1.15, 0.92, 1.1, 1],
    transition: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' },
  },
}

export default function MathsJarvisOrb({ state }: MathsJarvisOrbProps) {
  const colors = STATE_COLORS[state]
  const anim = STATE_ANIMATIONS[state]

  return (
    <div className="flex items-center justify-center" style={{ height: 320, width: '100%' }}>
      <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
        {/* Outer glow */}
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: colors.outer,
          }}
        />

        {/* Rotating ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: state === 'THINKING' ? 1.5 : 4, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            width: 180,
            height: 180,
            borderRadius: '50%',
            border: `1px solid ${colors.ring}`,
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
          }}
        />

        {/* Second ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: state === 'THINKING' ? 2.2 : 6, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            width: 140,
            height: 140,
            borderRadius: '50%',
            border: `1px solid ${colors.ring}`,
            borderBottomColor: 'transparent',
            borderLeftColor: 'transparent',
            opacity: 0.6,
          }}
        />

        {/* Core orb */}
        <motion.div
          animate={anim}
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: colors.inner,
            boxShadow: `0 0 40px ${colors.ring}, 0 0 80px ${colors.ring}40`,
          }}
        />

        {/* Inner pulse */}
        <motion.div
          animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: colors.inner,
            opacity: 0.3,
          }}
        />
      </div>
    </div>
  )
}
