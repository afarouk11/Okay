import { createClient } from '@supabase/supabase-js';
import { applyHeaders, isRateLimited, getIp } from './_lib.js';

/**
 * GET  /api/memory        — retrieve the most recent Jarvis sessions for the
 *                           authenticated user.  Query param: limit (default 5).
 * POST /api/memory        — save a new Jarvis session record.
 *
 * Both routes require a valid Supabase Bearer token in the Authorization header.
 * When Supabase is not configured (demo mode), GET returns an empty list and
 * POST returns a success stub so the frontend degrades gracefully.
 */

const RATE_LIMIT_MAX    = 60;
const RATE_LIMIT_WINDOW = 60_000;  // per 60 s

const MAX_ERRORS_LENGTH    = 20;   // max entries in specific_errors array
const MAX_ERROR_STR_LENGTH = 200;  // max chars per error string
const MAX_TOPIC_LENGTH     = 100;  // max chars for topic field
const MAX_LIMIT            = 20;   // max sessions returned per request

let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
} catch (_) {}

export default async function handler(req, res) {
  applyHeaders(res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getIp(req);
  if (isRateLimited(`${ip}:memory`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW)) {
    return res.status(429).json({ error: 'Too many requests — please try again later' });
  }

  // ── Demo mode — no Supabase ───────────────────────────────────────────────
  if (!supabase) {
    if (req.method === 'GET') return res.status(200).json({ sessions: [] });
    return res.status(200).json({ success: true });
  }

  // ── Authenticate ──────────────────────────────────────────────────────────
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

  // ── GET — retrieve recent sessions ───────────────────────────────────────
  if (req.method === 'GET') {
    const rawLimit = parseInt(req.query?.limit ?? '5', 10);
    const limit    = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
      : 5;

    const { data, error } = await supabase
      .from('jarvis_sessions')
      .select('id, session_date, topic, mastery_score, specific_errors, duration_ms')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[memory] GET error:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve session history' });
    }

    return res.status(200).json({ sessions: data ?? [] });
  }

  // ── POST — save a session ─────────────────────────────────────────────────
  const { topic, mastery_score, specific_errors, duration_ms } = req.body ?? {};

  // Validate optional fields
  if (topic !== undefined && topic !== null) {
    if (typeof topic !== 'string') {
      return res.status(400).json({ error: 'topic must be a string' });
    }
    if (topic.length > MAX_TOPIC_LENGTH) {
      return res.status(400).json({ error: `topic must not exceed ${MAX_TOPIC_LENGTH} characters` });
    }
  }

  if (mastery_score !== undefined && mastery_score !== null) {
    const n = Number(mastery_score);
    if (!Number.isFinite(n) || n < 0 || n > 1) {
      return res.status(400).json({ error: 'mastery_score must be a number between 0 and 1' });
    }
  }

  if (specific_errors !== undefined && specific_errors !== null) {
    if (!Array.isArray(specific_errors)) {
      return res.status(400).json({ error: 'specific_errors must be an array' });
    }
    if (specific_errors.length > MAX_ERRORS_LENGTH) {
      return res.status(400).json({ error: `specific_errors must not exceed ${MAX_ERRORS_LENGTH} entries` });
    }
    for (const e of specific_errors) {
      if (typeof e !== 'string') {
        return res.status(400).json({ error: 'each entry in specific_errors must be a string' });
      }
      if (e.length > MAX_ERROR_STR_LENGTH) {
        return res.status(400).json({ error: `each error string must not exceed ${MAX_ERROR_STR_LENGTH} characters` });
      }
    }
  }

  if (duration_ms !== undefined && duration_ms !== null) {
    const d = Number(duration_ms);
    if (!Number.isInteger(d) || d < 0) {
      return res.status(400).json({ error: 'duration_ms must be a non-negative integer' });
    }
  }

  const record = {
    user_id:         user.id,
    topic:           typeof topic === 'string' ? topic.trim() || null : null,
    mastery_score:   mastery_score != null ? Number(mastery_score) : null,
    specific_errors: Array.isArray(specific_errors) ? specific_errors : [],
    duration_ms:     duration_ms != null ? Math.floor(Number(duration_ms)) : null,
  };

  const { error: insertErr } = await supabase
    .from('jarvis_sessions')
    .insert(record);

  if (insertErr) {
    console.error('[memory] POST error:', insertErr.message);
    return res.status(500).json({ error: 'Failed to save session' });
  }

  return res.status(201).json({ success: true });
}
