// Resend Email Handler
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(500).json({ error: 'Missing Resend key' });

  const { to, type, name } = req.body;
  if (!to) return res.status(400).json({ error: 'Missing recipient email' });

  const templates = {
    welcome: {
      subject: 'Welcome to Synaptiq — Your A-Level Maths AI Tutor',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0A0C12;color:#F5F2EC;padding:2rem;border-radius:16px">
          <h1 style="font-size:2rem;margin-bottom:.5rem">Welcome to Synapti<span style="color:#C9A84C">q</span> 🎓</h1>
          <p style="color:#8892A4">Hi ${name || 'there'},</p>
          <p style="color:#8892A4;line-height:1.7">You're now part of the UK's most focused A-Level Maths AI tutoring platform. Your 7-day free trial has started — no card needed.</p>
          <div style="background:#151821;border:1px solid rgba(201,168,76,0.2);border-radius:12px;padding:1.5rem;margin:1.5rem 0">
            <h3 style="color:#C9A84C;margin-bottom:1rem">Get started in 3 steps:</h3>
            <p style="color:#8892A4;margin:.5rem 0">1️⃣ <strong style="color:#F5F2EC">Open the AI Tutor</strong> — ask anything about your A-Level topics</p>
            <p style="color:#8892A4;margin:.5rem 0">2️⃣ <strong style="color:#F5F2EC">Browse A-Level Content</strong> — Pure 1 & 2, Stats, Mechanics chapters</p>
            <p style="color:#8892A4;margin:.5rem 0">3️⃣ <strong style="color:#F5F2EC">Upload your mark scheme</strong> — AI answers aligned to your exam board</p>
          </div>
          <a href="${process.env.APP_URL || 'https://synaptiqai.co.uk'}" style="display:inline-block;background:#C9A84C;color:#07080C;padding:1rem 2rem;border-radius:10px;text-decoration:none;font-weight:700">Open Synaptiq →</a>
          <p style="color:#8892A4;font-size:.8rem;margin-top:2rem">Synaptiq · A-Level Maths AI Tutor · <a href="#" style="color:#C9A84C">Unsubscribe</a></p>
        </div>
      `
    },
    trial_reminder: {
      subject: 'Your Synaptiq trial ends in 2 days',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0A0C12;color:#F5F2EC;padding:2rem;border-radius:16px">
          <h1 style="font-size:1.8rem">Hi ${name || 'there'}, your trial ends soon ⏰</h1>
          <p style="color:#8892A4;line-height:1.7">Your 7-day free trial of Synaptiq ends in 2 days. Upgrade now to keep your progress, uploads, and access to all A-Level content.</p>
          <a href="${process.env.APP_URL || 'https://synaptiqai.co.uk'}?upgrade=true" style="display:inline-block;background:#C9A84C;color:#07080C;padding:1rem 2rem;border-radius:10px;text-decoration:none;font-weight:700">Upgrade Now — £60/month →</a>
        </div>
      `
    }
  };

  const template = templates[type] || templates.welcome;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Synaptiq <hello@synaptiqai.co.uk>',
        to: [to],
        subject: template.subject,
        html: template.html
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || 'Resend error' });
    return res.status(200).json({ id: data.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
