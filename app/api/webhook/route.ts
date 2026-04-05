import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'

const siteUrl = process.env.SITE_URL || process.env.APP_URL || 'https://synaptiq.co.uk'

async function sendEmail(to: string, type: string, params: { name?: string; stats?: Record<string, unknown> } = {}) {
  if (!process.env.RESEND_API_KEY) return
  const payload = { type, email: to, name: params.name || '', stats: params.stats || {} }
  await fetch(`${siteUrl}/api/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {})
}

export async function POST(request: NextRequest) {
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

  // Read raw body for signature verification
  const rawBody = await request.arrayBuffer()
  const stripe = new Stripe(stripeSecret)

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      Buffer.from(rawBody),
      sig,
      webhookSecret,
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid signature'
    console.error('Webhook signature failed:', msg)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Idempotency: skip duplicate events
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

  // Record event for idempotency
  try {
    await supabase.from('processed_webhooks').insert({ event_id: event.id })
  } catch (_) {}

  return NextResponse.json({ received: true })
}
