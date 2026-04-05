import { NextRequest, NextResponse } from 'next/server'
import { isRateLimited, getIp } from '@/lib/rateLimit'
import { createServiceClient } from '@/lib/supabase'

async function getUser(request: NextRequest) {
  const supabase = createServiceClient()
  if (!supabase) return { user: null, supabase: null }
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
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
    email?: string
    successUrl?: string
    cancelUrl?: string
    annual?: boolean
  }
  const { action, plan, email, successUrl, cancelUrl, annual } = body

  // ── Customer Portal ───────────────────────────────────────────────────────
  if (action === 'portal') {
    if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })
    try {
      const searchRes = await fetch(
        `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
        { headers: { Authorization: `Bearer ${stripeKey}` } },
      )
      const searchData = await searchRes.json() as { data?: { id: string }[] }
      const customer = searchData.data?.[0]
      if (!customer) {
        return NextResponse.json({ error: 'No Stripe customer found for this email' }, { status: 404 })
      }

      const returnUrl = process.env.APP_URL || process.env.SITE_URL || 'https://synaptiq.co.uk'
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
  const prices: Record<string, string> = {
    student:        process.env.STRIPE_PRICE_STUDENT        || 'price_student_monthly_placeholder',
    student_annual: process.env.STRIPE_PRICE_STUDENT_ANNUAL || 'price_student_annual_placeholder',
    homeschool:     process.env.STRIPE_PRICE_HOMESCHOOL      || 'price_homeschool_placeholder',
  }

  const priceKey = plan === 'student' && annual ? 'student_annual' : (plan || 'student')
  const priceId = prices[priceKey] || prices.student

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
        'customer_email': email || '',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'subscription_data[trial_period_days]': '7',
        'success_url': successUrl || `${process.env.APP_URL || 'http://localhost:3000'}/?session_id={CHECKOUT_SESSION_ID}&status=success`,
        'cancel_url': cancelUrl || `${process.env.APP_URL || 'http://localhost:3000'}/?status=cancelled`,
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
