import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

import { isRateLimited, getIp } from '@/lib/rateLimit'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ALLOWED_PLANS = new Set(['student', 'homeschool'])
const siteUrl = process.env.SITE_URL || process.env.APP_URL || 'https://synaptiq.co.uk'

function getBaseUrl(request: NextRequest) {
  const configured = process.env.APP_URL || process.env.SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      // fall through
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

async function sendEmail(to: string, type: string, params: { name?: string; stats?: Record<string, unknown> } = {}) {
  if (!process.env.RESEND_API_KEY) return
  const payload = { type, email: to, name: params.name || '', stats: params.stats || {} }
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (process.env.INTERNAL_API_KEY) {
    headers['x-internal-key'] = process.env.INTERNAL_API_KEY
  }
  await fetch(`${siteUrl}/api/resend`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  }).catch(() => {})
}

function getResource(request: NextRequest, body: Record<string, unknown>) {
  const { searchParams } = new URL(request.url)
  const queryResource = searchParams.get('resource')
  if (queryResource) return queryResource
  if (typeof body.resource === 'string') return body.resource
  if (request.headers.get('stripe-signature')) return 'webhook'
  return 'stripe'
}

async function handleStripe(request: NextRequest) {
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
        return NextResponse.json({ error: portalData.error?.message || 'Portal error' }, { status: portalRes.status })
      }
      return NextResponse.json({ url: portalData.url })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  const prices: Record<string, string | undefined> = {
    student: process.env.STRIPE_PRICE_STUDENT,
    student_annual: process.env.STRIPE_PRICE_STUDENT_ANNUAL,
    homeschool: process.env.STRIPE_PRICE_HOMESCHOOL,
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
        mode: 'subscription',
        customer_email: customerEmail,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'subscription_data[trial_period_days]': '7',
        success_url: resolvedSuccessUrl,
        cancel_url: resolvedCancelUrl,
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

async function handleWebhook(request: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeSecret || !webhookSecret) {
    return NextResponse.json({ error: 'Payments not configured' }, { status: 503 })
  }

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const rawBody = await request.arrayBuffer()
  const stripe = new Stripe(stripeSecret)

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(Buffer.from(rawBody), sig, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid signature'
    console.error('Webhook signature failed:', msg)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('processed_webhooks')
    .select('event_id')
    .eq('event_id', event.id)
    .single()
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    const data = event.data.object as unknown as Record<string, unknown>

    switch (event.type) {
      case 'checkout.session.completed': {
        const emailAddr = typeof data.customer_email === 'string' ? data.customer_email : null
        const metadata = data.metadata && typeof data.metadata === 'object'
          ? data.metadata as Record<string, string>
          : {}
        const plan = metadata.plan || 'student'
        if (emailAddr) {
          const { error: updateErr } = await supabase.from('profiles').update({
            plan,
            subscription_status: 'active',
            stripe_customer_id: data.customer,
            subscription_id: data.subscription,
          }).eq('email', emailAddr)
          if (updateErr) console.error('Webhook profile update failed:', updateErr.message)
          await sendEmail(emailAddr, 'payment_confirmed', { stats: { plan } })
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const customerId = data.customer as string
        const { error: updateErr } = await supabase.from('profiles').update({
          subscription_status: 'active',
        }).eq('stripe_customer_id', customerId)
        if (updateErr) console.error('Webhook status update failed:', updateErr.message)
        break
      }

      case 'invoice.payment_failed': {
        const customerId = data.customer as string
        const { data: profile } = await supabase
          .from('profiles')
          .select('email,name')
          .eq('stripe_customer_id', customerId)
          .single()
        const { error: updateErr } = await supabase.from('profiles').update({
          subscription_status: 'past_due',
        }).eq('stripe_customer_id', customerId)
        if (updateErr) console.error('Webhook past_due update failed:', updateErr.message)
        if (profile?.email) {
          await sendEmail(profile.email as string, 'payment_failed', { name: profile.name as string, stats: {} })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const customerId = data.customer as string
        const { error: updateErr } = await supabase.from('profiles').update({
          subscription_status: 'cancelled',
          plan: 'free',
        }).eq('stripe_customer_id', customerId)
        if (updateErr) console.error('Webhook cancellation update failed:', updateErr.message)
        break
      }
    }
  } catch (e) {
    console.error('Webhook processing error:', e instanceof Error ? e.message : e)
  }

  try {
    await supabase.from('processed_webhooks').insert({ event_id: event.id })
  } catch {
    // no-op
  }

  return NextResponse.json({ received: true })
}

export async function GET(request: NextRequest) {
  const resource = new URL(request.url).searchParams.get('resource')
  if (resource === 'webhook') {
    return NextResponse.json({ status: 'ok' })
  }
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function POST(request: NextRequest) {
  const body = await request.clone().json().catch(() => ({} as Record<string, unknown>))
  const resource = getResource(request, body)

  if (resource === 'webhook') return handleWebhook(request)
  if (resource === 'stripe') return handleStripe(request)

  return NextResponse.json({ error: 'Unknown payments resource' }, { status: 400 })
}
