import { applyHeaders, isRateLimited, getIp, fetchWithRetry } from './_lib.js';
import { createClient } from '@supabase/supabase-js';

const PAPERS_MODEL = 'claude-sonnet-4-6';
const ALLOWED_EXAM_BOARDS_LIST = ['AQA', 'Edexcel', 'OCR', 'WJEC'];
const ALLOWED_EXAM_BOARDS = new Set(ALLOWED_EXAM_BOARDS_LIST);
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

// Supabase client (service role) — used only for JWT verification
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
} catch (_) {}

export default async function handler(req, res) {
  applyHeaders(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI service not configured.' });

  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip = getIp(req);
  if (isRateLimited(`${ip}:papers`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
  }

  // ── Authentication (required when Supabase is configured) ────────────────
  let userId = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ') && supabase) {
    const token = authHeader.slice(7);
    if (!token.startsWith('demo_token_')) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) userId = user.id;
      } catch (_) {}
    }
  }

  if (supabase && !userId) {
    return res.status(401).json({ error: 'Authentication required. Please log in to generate practice papers.' });
  }

  // ── Validate request body ────────────────────────────────────────────────
  const { topic, exam_board, difficulty, count, include_mark_scheme } = req.body || {};

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: 'topic is required.' });
  }
  // Cap topic length to prevent prompt-stuffing via the user-controlled field
  const safeTopic = topic.trim().slice(0, 120);

  if (!exam_board || !ALLOWED_EXAM_BOARDS.has(exam_board)) {
    return res.status(400).json({
      error: `exam_board must be one of: ${ALLOWED_EXAM_BOARDS_LIST.join(', ')}.`
    });
  }

  const parsedDifficulty = Number(difficulty);
  if (!Number.isInteger(parsedDifficulty) || parsedDifficulty < 1 || parsedDifficulty > 5) {
    return res.status(400).json({ error: 'difficulty must be an integer between 1 and 5.' });
  }

  const parsedCount = count !== undefined ? Number(count) : 3;
  if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 5) {
    return res.status(400).json({ error: 'count must be an integer between 1 and 5.' });
  }

  const includeMarkScheme = include_mark_scheme !== false;

  // ── Build system prompt ──────────────────────────────────────────────────
  const sanitisedTopic = topic.trim().slice(0, 200);
  const systemPrompt =
    `You are an expert ${exam_board} A-Level Maths examiner. ` +
    `Generate ${parsedCount} exam-style question${parsedCount !== 1 ? 's' : ''} on ${sanitisedTopic} ` +
    `at difficulty ${parsedDifficulty}/5. ` +
    `For each question include: the question text, marks, working hints, and a full mark scheme. ` +
    `Format as JSON array: [{"question": "...", "marks": 0, "hints": ["..."], "mark_scheme": "..."}]. ` +
    `Match the exact style, notation and language of real ${exam_board} A-Level papers. ` +
    `Return only the JSON array with no surrounding text or markdown fences.`;

  const userMessage = includeMarkScheme
    ? `Generate the questions with full mark schemes.`
    : `Generate the questions. Omit detailed mark schemes — provide only brief answer notes.`;

  // ── Call Anthropic ────────────────────────────────────────────────────────
  try {
    const r = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: PAPERS_MODEL,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        max_tokens: 2000
      })
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || 'AI service error.' });
    }

    // Extract text content from Anthropic response
    const rawText = data?.content?.[0]?.text || '';

    // Parse the JSON array returned by the model
    let questions;
    try {
      // Strip any accidental markdown fences
      const cleaned = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      questions = JSON.parse(cleaned);
      if (!Array.isArray(questions)) throw new Error('Not an array');
    } catch (_) {
      // Return raw text if parsing fails so the client can still display it
      return res.status(200).json({ questions: [], raw: rawText });
    }

    return res.status(200).json({ questions });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to connect to AI service. Please try again.' });
  }
}
