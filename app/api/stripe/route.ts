import { NextRequest, NextResponse } from 'next/server'
import { isRateLimited, getIp } from '@/lib/rateLimit'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ALLOWED_PLANS = new Set(['student', 'homeschool'])

function getBaseUrl(request: NextRequest) {
  const configured = process.env.APP_URL || process.env.SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      // fall through to request origin
    }
  }

  return new URL(request.url).origin
}

function getSafeRedirectUrl(request: NextRequest, candidate: string | undefined, fallbackPath: string) {
  const baseUrl = getBaseUrl(request)
  const fallbackUrl = new URL(fallbackPath, baseUrl).toString()
  if (!candidate) return fallbackUrl

  try {
    const parsed = new URL(candidate, baseUrl)
    return parsed.origin === baseUrl ? parsed.toString() : null
  } catch {
    return null
  }
}

async function getUser(request: NextRequest) {
  const supabase = createServiceClient()
  if (!supabase) return { user: null, supabase: null }
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) return { user: null, supabase }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { user: null, supabase }
  return { user, supabase }
}

export async function POST(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:stripe`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — please try again later' }, { status: 429 })
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return NextResponse.json({ error: 'Missing Stripe key' }, { status: 500 })

  const { user } = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    action?: string
    plan?: string
    successUrl?: string
    cancelUrl?: string
    annual?: boolean
  }
  const { action, plan, successUrl, cancelUrl, annual } = body

  if (plan && !ALLOWED_PLANS.has(plan)) {
    return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
  }

  // ── Customer Portal ───────────────────────────────────────────────────────
  if (action === 'portal') {
    const portalEmail = user.email?.toLowerCase().trim()
    if (!portalEmail) {
      return NextResponse.json({ error: 'No email found for the authenticated user' }, { status: 400 })
    }

    try {
      const searchRes = await fetch(
        `https://api.stripe.com/v1/customers?email=${encodeURIComponent(portalEmail)}&limit=1`,
        { headers: { Authorization: `Bearer ${stripeKey}` } },
      )
      const searchData = await searchRes.json() as { data?: { id: string }[] }
      const customer = searchData.data?.[0]
      if (!customer) {
        return NextResponse.json({ error: 'No Stripe customer found for this email' }, { status: 404 })
      }

      const returnUrl = getBaseUrl(request)
      const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ customer: customer.id, return_url: returnUrl }),
      })
      const portalData = await portalRes.json() as { url?: string; error?: { message?: string } }
      if (!portalRes.ok) {
        return NextResponse.json(
          { error: portalData.error?.message || 'Portal error' },
          { status: portalRes.status },
        )
      }
      return NextResponse.json({ url: portalData.url })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  // ── Checkout Session ──────────────────────────────────────────────────────
  const prices: Record<string, string | undefined> = {
    student:        process.env.STRIPE_PRICE_STUDENT,
    student_annual: process.env.STRIPE_PRICE_STUDENT_ANNUAL,
    homeschool:     process.env.STRIPE_PRICE_HOMESCHOOL,
  }

  const priceKey = plan === 'student' && annual ? 'student_annual' : (plan || 'student')
  const priceId = prices[priceKey] || prices.student
  const customerEmail = user.email?.toLowerCase().trim() || ''
  const resolvedSuccessUrl = getSafeRedirectUrl(request, successUrl, '/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}')
  const resolvedCancelUrl = getSafeRedirectUrl(request, cancelUrl, '/pricing?checkout=cancelled')

  if (!priceId) {
    return NextResponse.json({ error: 'Stripe price not configured for the selected plan' }, { status: 500 })
  }

  if (!customerEmail) {
    return NextResponse.json({ error: 'No verified email found for this account' }, { status: 400 })
  }

  if (!resolvedSuccessUrl || !resolvedCancelUrl) {
    return NextResponse.json({ error: 'Invalid redirect URL' }, { status: 400 })
  }

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'mode': 'subscription',
        'customer_email': customerEmail,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'subscription_data[trial_period_days]': '7',
        'success_url': resolvedSuccessUrl,
        'cancel_url': resolvedCancelUrl,
      }),
    })
    const data = await r.json() as { url?: string; id?: string; error?: { message?: string } }
    if (!r.ok) return NextResponse.json({ error: data.error?.message || 'Stripe error' }, { status: r.status })
    return NextResponse.json({ url: data.url, sessionId: data.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
