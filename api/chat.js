import { applyHeaders, isRateLimited, getIp } from './_lib.js';
import { createClient } from '@supabase/supabase-js';

const TRIAL_DAILY_LIMIT = 20;

// Supabase client (service role) — used only for per-user rate limit checks
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
} catch (_) {}

export default async function handler(req, res) {
  applyHeaders(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIp(req);
  // IP-level throttle (30 req/min) — protects against unauthenticated abuse
  if (isRateLimited(`${ip}:chat`, 30, 60_000)) {
    return res.status(429).json({ error: 'Too many requests — please try again later' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured. Add it to your Vercel environment variables.' });

  // ── Per-user auth & rate limiting ──────────────────────────────────────────
  let userId = null;
  let isPaidUser = false;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ') && supabase) {
    const token = authHeader.slice(7);
    if (!token.startsWith('demo_token_')) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('id', user.id)
            .single();
          isPaidUser = profile?.subscription_status === 'active';
        }
      } catch (_) {}
    }
  }

  // Per-user daily cap: trial/free users → 20 calls/day
  if (userId && !isPaidUser) {
    const dayKey = `user:${userId}:chat:${new Date().toISOString().slice(0, 10)}`;
    if (isRateLimited(dayKey, TRIAL_DAILY_LIMIT, 24 * 60 * 60_000)) {
      return res.status(429).json({
        error: `You've reached your daily limit of ${TRIAL_DAILY_LIMIT} AI messages. Upgrade to continue.`,
        code: 'daily_limit_exceeded'
      });
    }
  }

  // ── Validate request body ─────────────────────────────────────────────────
  const { model, messages, max_tokens, system } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request: messages array required' });
  }
  if (messages.length > 50) {
    return res.status(400).json({ error: 'Too many messages. Please start a new conversation.' });
  }
  if (JSON.stringify(messages).length > 100000) {
    return res.status(400).json({ error: 'Message content too long. Please shorten your request.' });
  }

  // ── Call Anthropic ────────────────────────────────────────────────────────
  try {
    const body = { model: model || 'claude-sonnet-4-6', messages, max_tokens: max_tokens || 1500 };
    if (system) body.system = system;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to connect to AI service. Please try again.' });
  }
}
