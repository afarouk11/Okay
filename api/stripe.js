// Stripe Checkout Session Handler
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: 'Missing Stripe key' });

  const { plan, email, successUrl, cancelUrl, annual } = req.body;

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
