'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Zap, Star, Building2, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'

type PlanConfig = {
  name: string
  price: string
  period: string
  description: string
  color: string
  icon: typeof Zap
  popular: boolean
  features: string[]
  cta: string
  action: 'link' | 'checkout'
  href?: string
  checkoutPlan?: 'student' | 'homeschool'
}

const PLANS: PlanConfig[] = [
  {
    name: 'Free',
    price: '£0',
    period: 'forever',
    description: 'Get started with Jarvis',
    color: '#9AA4AF',
    icon: Zap,
    popular: false,
    features: [
      '20 Jarvis messages / day',
      'Basic dashboard',
      'Practice questions',
      '3 free lessons',
      'Limited plan generation',
    ],
    cta: 'Get started free',
    action: 'link',
    href: '/dashboard',
  },
  {
    name: 'Student',
    price: '£35',
    period: 'per month',
    description: 'Full Jarvis — unlimited tutoring',
    color: '#4F8CFF',
    icon: Star,
    popular: true,
    features: [
      'Unlimited Jarvis messages',
      'All lessons unlocked',
      'Daily personalised plans',
      'Adaptive difficulty',
      'Mistake tracking',
      'Voice input & output',
      'Spaced repetition',
      'Progress analytics',
    ],
    cta: 'Start 7-day trial',
    action: 'checkout',
    checkoutPlan: 'student',
  },
  {
    name: 'School',
    price: '£200',
    period: 'per month',
    description: 'For schools and institutions',
    color: '#22C55E',
    icon: Building2,
    popular: false,
    features: [
      'Everything in Student',
      'Up to 60 student seats',
      'Teacher dashboard',
      'Assignment management',
      'Class progress reports',
      'Priority support',
      'Custom branding',
    ],
    cta: 'Contact us',
    action: 'link',
    href: '/contact',
  },
]

export default function PricingClient() {
  const router = useRouter()
  const { token, loading } = useAuth()
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  async function startCheckout(plan: PlanConfig) {
    if (plan.action !== 'checkout' || !plan.checkoutPlan || loading || checkoutBusy) return

    if (!token) {
      router.push('/login?mode=register')
      return
    }

    setCheckoutError(null)
    setCheckoutBusy(plan.name)

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: plan.checkoutPlan,
          successUrl: `${window.location.origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/pricing?checkout=cancelled`,
        }),
      })

      const data = await res.json().catch(() => ({})) as { error?: string; url?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Unable to start checkout right now.')
      }

      window.location.assign(data.url)
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to start checkout right now.')
    } finally {
      setCheckoutBusy(null)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0B0F14' }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-8 py-4 border-b border-white/5"
        style={{ background: 'rgba(18,24,33,0.8)', backdropFilter: 'blur(20px)' }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #4F8CFF, #22C55E)' }}
          >
            J
          </div>
          <span className="font-semibold text-[15px] text-foreground">Jarvis</span>
        </Link>
        <Link href="/dashboard">
          <span className="text-sm text-muted hover:text-foreground transition-colors">← Dashboard</span>
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: '#4F8CFF' }}
          >
            Pricing
          </p>
          <h1 className="text-4xl font-bold text-foreground tracking-tight mb-4">
            Your personal tutor,<br />
            <span style={{ background: 'linear-gradient(135deg, #4F8CFF, #22C55E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              available 24/7
            </span>
          </h1>
          <p className="text-muted text-lg max-w-xl mx-auto">
            Jarvis never sleeps, never judges, and always teaches the right way — step by step.
          </p>
        </motion.div>

        {checkoutError && (
          <div
            className="mb-6 rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fecaca' }}
          >
            {checkoutError}
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon
            const isBusy = checkoutBusy === plan.name
            const ctaStyles = plan.popular
              ? { background: '#4F8CFF', color: '#fff' }
              : {
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#E6EDF3',
                }

            return (
              <motion.div
                key={plan.name}
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="relative rounded-card p-6 flex flex-col"
                style={{
                  background: plan.popular
                    ? 'linear-gradient(180deg, rgba(79,140,255,0.08) 0%, rgba(18,24,33,0.9) 60%)'
                    : 'rgba(18,24,33,0.8)',
                  border: plan.popular
                    ? '1px solid rgba(79,140,255,0.3)'
                    : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: plan.popular ? '0 8px 40px rgba(79,140,255,0.12)' : undefined,
                }}
              >
                {plan.popular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #4F8CFF, #22C55E)' }}
                  >
                    Most popular
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${plan.color}15`, border: `1px solid ${plan.color}30` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: plan.color }} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{plan.name}</span>
                </div>

                <div className="mb-2">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted ml-1.5">/ {plan.period}</span>
                </div>
                <p className="text-sm text-muted mb-6">{plan.description}</p>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-muted">
                      <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {plan.action === 'checkout' ? (
                  <motion.button
                    whileHover={{ scale: isBusy ? 1 : 1.02 }}
                    whileTap={{ scale: isBusy ? 1 : 0.97 }}
                    onClick={() => startCheckout(plan)}
                    disabled={isBusy || loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-medium transition-all"
                    style={{ ...ctaStyles, opacity: (isBusy || loading) ? 0.75 : 1 }}
                  >
                    {isBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</> : <>{plan.cta}<ArrowRight className="w-4 h-4" /></>}
                  </motion.button>
                ) : (
                  <Link href={plan.name === 'Free' && !token ? '/login?mode=register' : (plan.href || '/')} className="block">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-medium transition-all"
                      style={ctaStyles}
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4" />
                    </motion.div>
                  </Link>
                )}
              </motion.div>
            )
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-muted mt-12"
        >
          No contracts. Cancel anytime. VAT included where applicable.
        </motion.p>
      </main>
    </div>
  )
}
