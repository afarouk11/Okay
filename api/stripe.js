// Stripe Checkout Session + Customer Portal + Webhook Handler
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { applyHeaders, isRateLimited, getIp } from './_lib.js';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// Disable the built-in body parser so we can read the raw bytes needed for
// Stripe webhook signature verification.  Non-webhook requests parse JSON
// manually below.
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function sendEmail(to, type, { name, stats } = {}) {
  if (!process.env.RESEND_API_KEY) return;
  const payload = { type, email: to, name: name || '', stats: stats || {} };
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.INTERNAL_API_KEY) {
    headers['x-internal-key'] = process.env.INTERNAL_API_KEY;
  }
  await fetch(`${process.env.SITE_URL}/api/resend`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  }).catch(() => {});
}

async function handleWebhook(req, res) {
  const supabase = getSupabase();
  if (!stripe || !supabase) return res.status(503).json({ error: 'Payments not configured' });
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const data = event.data.object;

  // Idempotency: skip duplicate events
  const { data: existing } = await supabase.from('processed_webhooks')
    .select('event_id').eq('event_id', event.id).single();
  if (existing) return res.status(200).json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const email = data.customer_email;
        const plan = data.metadata?.plan || 'student';
        const { error: updateErr } = await supabase.from('profiles').update({
          plan,
          subscription_status: 'active',
          stripe_customer_id: data.customer,
          subscription_id: data.subscription,
        }).eq('email', email);
        if (updateErr) console.error('Webhook profile update failed:', updateErr.message);
        await sendEmail(email, 'payment_confirmed', { stats: { plan } });
        break;
      }

      case 'invoice.payment_succeeded': {
        const customerId = data.customer;
        const { error: updateErr } = await supabase.from('profiles').update({
          subscription_status: 'active',
        }).eq('stripe_customer_id', customerId);
        if (updateErr) console.error('Webhook status update failed:', updateErr.message);
        break;
      }

      case 'invoice.payment_failed': {
        const customerId = data.customer;
        const { data: profile } = await supabase.from('profiles')
          .select('email,name').eq('stripe_customer_id', customerId).single();
        const { error: updateErr } = await supabase.from('profiles').update({
          subscription_status: 'past_due',
        }).eq('stripe_customer_id', customerId);
        if (updateErr) console.error('Webhook past_due update failed:', updateErr.message);
        if (profile?.email) {
          await sendEmail(profile.email, 'payment_failed', { name: profile.name, stats: {} });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const customerId = data.customer;
        const { error: updateErr } = await supabase.from('profiles').update({
          subscription_status: 'cancelled',
          plan: 'free',
        }).eq('stripe_customer_id', customerId);
        if (updateErr) console.error('Webhook cancellation update failed:', updateErr.message);
        break;
      }
    }
  } catch (e) {
    console.error('Webhook processing error:', e.message);
  }

  // Record event for idempotency
  try { await supabase.from('processed_webhooks').insert({ event_id: event.id }); } catch (_) {}

  return res.status(200).json({ received: true });
}

export default async function handler(req, res) {
  applyHeaders(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Route Stripe webhook events by their signature header
  if (req.headers['stripe-signature']) {
    return handleWebhook(req, res);
  }
  // Non-webhook: parse JSON body if not already an object (bodyParser is disabled)
  if (req.body === undefined || typeof req.body !== 'object' || req.body === null) {
    const raw = await getRawBody(req);
    try {
      req.body = JSON.parse(raw.toString() || '{}');
    } catch (e) {
      console.error('JSON parse error:', e.message);
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const ip = getIp(req);
  if (isRateLimited(`${ip}:stripe`, 10, 60_000)) {
    return res.status(429).json({ error: 'Too many requests — please try again later' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: 'Missing Stripe key' });

  const { action, plan, email, successUrl, cancelUrl, annual } = req.body;

  // ── Customer Portal ─────────────────────────────────────────────────────────
  if (action === 'portal') {
    const supabase = getSupabase();
    let portalEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';

    if (supabase) {
      const token = req.headers.authorization?.replace('Bearer ', '').trim();
      if (!token || token.startsWith('demo_token_')) {
        return res.status(401).json({ error: 'Authentication required to access billing portal' });
      }

      const { data: authData, error: authErr } = await supabase.auth.getUser(token);
      const user = authData?.user;
      if (authErr || !user?.email) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      portalEmail = user.email.toLowerCase().trim();
    }

    if (!portalEmail) return res.status(400).json({ error: 'email is required' });

    try {
      // When auth is configured, look up the Stripe customer for the authenticated account only.
      const searchRes = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(portalEmail)}&limit=1`, {
        headers: { 'Authorization': `Bearer ${stripeKey}` }
      });
      const searchData = await searchRes.json();
      const customer = searchData.data?.[0];
      if (!customer) return res.status(404).json({ error: 'No Stripe customer found for this email' });

      const returnUrl = process.env.APP_URL || process.env.SITE_URL || 'https://synaptiq.co.uk';
      const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ customer: customer.id, return_url: returnUrl }),
      });
      const portalData = await portalRes.json();
      if (!portalRes.ok) return res.status(portalRes.status).json({ error: portalData.error?.message || 'Portal error' });
      return res.status(200).json({ url: portalData.url });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Price IDs — set these in your Stripe dashboard and add as env vars
  // Create separate monthly and annual price IDs in Stripe for the Student plan
  const prices = {
    student:          process.env.STRIPE_PRICE_STUDENT          || 'price_student_monthly_placeholder',
    student_annual:   process.env.STRIPE_PRICE_STUDENT_ANNUAL   || 'price_student_annual_placeholder',
    homeschool:       process.env.STRIPE_PRICE_HOMESCHOOL        || 'price_homeschool_placeholder',
  };

  const priceKey = plan === 'student' && annual ? 'student_annual' : (plan || 'student');
  const priceId = prices[priceKey] || prices.student;

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'mode': 'subscription',
        'customer_email': email || '',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'subscription_data[trial_period_days]': '7',
        'success_url': successUrl || `${process.env.APP_URL || 'http://localhost:3000'}/?session_id={CHECKOUT_SESSION_ID}&status=success`,
        'cancel_url': cancelUrl || `${process.env.APP_URL || 'http://localhost:3000'}/?status=cancelled`
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'Stripe error' });
    return res.status(200).json({ url: data.url, sessionId: data.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
