import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function urlEncoded(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

function getPlans() {
  return {
    student:    { monthly: process.env.STRIPE_PRICE_STUDENT,    annual: process.env.STRIPE_PRICE_STUDENT_ANNUAL },
    homeschool: { monthly: process.env.STRIPE_PRICE_HOMESCHOOL, annual: process.env.STRIPE_PRICE_HOMESCHOOL_ANNUAL },
    home:       { monthly: process.env.STRIPE_PRICE_HOME,       annual: process.env.STRIPE_PRICE_HOME_ANNUAL },
  };
}

async function handleWebhook(req, res, secretKey) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const raw = await readRawBody(req);
  const stripe = new Stripe(secretKey);

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const db = getSupabase();

  // Idempotency check
  if (db) {
    const { data: existing } = await db.from('processed_webhooks').select('event_id').eq('event_id', event.id).single();
    if (existing) return res.status(200).json({ duplicate: true });
  }

  let processed = false;
  try {
    const obj = event.data.object;
    if (event.type === 'checkout.session.completed') {
      const plan = obj.metadata?.plan || 'student';
      if (db) {
        await db.from('profiles').update({
          subscription_status: 'active', stripe_customer_id: obj.customer,
          stripe_subscription_id: obj.subscription, plan,
        }).eq('email', obj.customer_email);
      }
      if (obj.customer_email && db) {
        const siteUrl = process.env.SITE_URL || 'https://synaptiq.co.uk';
        await fetch(`${siteUrl}/api/resend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY || '' },
          body: JSON.stringify({ to: obj.customer_email, type: 'payment_confirmed', name: '' }),
        }).catch(() => {});
      }
    } else if (event.type === 'invoice.payment_succeeded') {
      if (db) await db.from('profiles').update({ subscription_status: 'active' }).eq('stripe_customer_id', obj.customer);
    } else if (event.type === 'invoice.payment_failed') {
      if (db) {
        const { data: profile } = await db.from('profiles').select('email,name').eq('stripe_customer_id', obj.customer).single();
        await db.from('profiles').update({ subscription_status: 'past_due' }).eq('stripe_customer_id', obj.customer);
        if (profile?.email) {
          const siteUrl = process.env.SITE_URL || 'https://synaptiq.co.uk';
          await fetch(`${siteUrl}/api/resend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY || '' },
            body: JSON.stringify({ to: profile.email, type: 'payment_failed', name: profile.name || '' }),
          }).catch(() => {});
        }
      }
    } else if (event.type === 'customer.subscription.deleted') {
      if (db) await db.from('profiles').update({ subscription_status: 'cancelled' }).eq('stripe_customer_id', obj.customer);
    }
    processed = true;
  } catch { /* still mark received */ }

  if (db) {
    try {
      await db.from('processed_webhooks').insert({ event_id: event.id, processed_at: new Date().toISOString() });
    } catch {}
  }

  return res.status(200).json({ received: true });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ error: 'Stripe is not configured' });

  if (req.headers['stripe-signature']) {
    return handleWebhook(req, res, secretKey);
  }

  // Parse body — either pre-parsed object or raw stream
  let body = req.body;
  if (body === undefined) {
    const raw = await readRawBody(req);
    const str = raw.toString() || '{}';
    try { body = JSON.parse(str); }
    catch { return res.status(400).json({ error: 'Invalid JSON in request body' }); }
  }

  const { action, plan, email, annual } = body;

  // Billing portal
  if (action === 'portal') {
    if (!email) return res.status(400).json({ error: 'email is required' });
    let portalEmail = email;
    const db = getSupabase();
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token && db) {
      const { data: { user } } = await db.auth.getUser(token).catch(() => ({ data: { user: null } }));
      if (user?.email) portalEmail = user.email;
    }
    try {
      const searchRes = await fetch(
        `https://api.stripe.com/v1/customers/search?query=email:'${encodeURIComponent(portalEmail)}'`,
        { headers: { Authorization: `Bearer ${secretKey}` } }
      );
      const searchData = await searchRes.json();
      if (!searchData.data?.length) return res.status(404).json({ error: 'No Stripe customer found for this email' });
      const customerId = searchData.data[0].id;
      const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: urlEncoded({ customer: customerId }),
      });
      const portalData = await portalRes.json();
      if (!portalRes.ok) return res.status(portalRes.status).json({ error: portalData.error?.message || 'Portal error' });
      return res.status(200).json({ url: portalData.url });
    } catch { return res.status(500).json({ error: 'Failed to create portal session' }); }
  }

  // Checkout
  const PLANS = getPlans();
  const planKey = PLANS[plan] ? plan : 'student';
  const planConfig = PLANS[planKey] || PLANS.student;
  const priceId = (annual && planConfig.annual) ? planConfig.annual : planConfig.monthly;
  const appUrl = process.env.APP_URL || 'https://synaptiq.co.uk';

  const sessionParams = {
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'subscription_data[trial_period_days]': '7',
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/pricing`,
  };
  if (email) sessionParams.customer_email = email;

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: urlEncoded(sessionParams),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'Stripe error' });
    return res.status(200).json({ url: data.url, sessionId: data.id });
  } catch { return res.status(500).json({ error: 'Failed to create checkout session' }); }
}
