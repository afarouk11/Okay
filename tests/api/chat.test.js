/**
 * Tests for app/api/chat/route.ts — App Router chat endpoint.
 *
 * The legacy api/chat.js was deleted (it shadowed this route on Vercel).
 * These tests verify the App Router handler's auth, validation, and
 * rate-limit behaviour using NextRequest/NextResponse mocks.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const supabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  };
  const isRateLimited = vi.fn().mockReturnValue(false);
  const getIp = vi.fn().mockReturnValue('127.0.0.1');
  const streamToClaude = vi.fn();
  return { supabase, isRateLimited, getIp, streamToClaude };
});

vi.mock('@/lib/supabase', () => ({
  createServiceClient: () => mocks.supabase,
}));

vi.mock('@/lib/rateLimit', () => ({
  isRateLimited: mocks.isRateLimited,
  getIp: mocks.getIp,
}));

vi.mock('@/lib/claude', () => ({
  streamToClaude: mocks.streamToClaude,
}));

import { POST } from '../../app/api/chat/route.ts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSupabaseBuilder(data = null) {
  const b = { _data: { data, error: null } };
  ['select', 'eq', 'single', 'update', 'lt', 'lte', 'gt', 'limit', 'order', 'insert'].forEach(m => {
    b[m] = vi.fn().mockReturnValue(b);
  });
  b.then = (res) => Promise.resolve(b._data).then(res);
  return b;
}

function makeRequest(body, headers = {}) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function makeStream(text = 'Hello from Claude') {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

const VALID_MESSAGES = [{ role: 'user', content: 'Explain differentiation.' }];

beforeEach(() => {
  vi.resetAllMocks();
  mocks.isRateLimited.mockReturnValue(false);
  mocks.getIp.mockReturnValue('127.0.0.1');
  mocks.streamToClaude.mockResolvedValue(makeStream());

  // Default: valid authenticated user
  mocks.supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  });

  // Default: paid plan — no trial limit
  mocks.supabase.from.mockReturnValue(
    makeSupabaseBuilder({ plan: 'homeschool' })
  );
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('auth', () => {
  it('returns 401 when the token is missing or invalid', async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid') });
    const res = await POST(makeRequest({ messages: VALID_MESSAGES }));
    expect(res.status).toBe(401);
  });
});

// ─── Request body validation ──────────────────────────────────────────────────

describe('request body validation', () => {
  it('returns 400 when messages is absent', async () => {
    const res = await POST(makeRequest({}, { Authorization: 'Bearer tok' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when messages is empty', async () => {
    const res = await POST(makeRequest({ messages: [] }, { Authorization: 'Bearer tok' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe('rate limiting', () => {
  it('returns 429 when IP rate limit is exceeded', async () => {
    mocks.isRateLimited.mockReturnValue(true);
    const res = await POST(makeRequest({ messages: VALID_MESSAGES }, { Authorization: 'Bearer tok' }));
    expect(res.status).toBe(429);
  });
});

// ─── Daily trial limit ────────────────────────────────────────────────────────

describe('trial daily limit', () => {
  it('returns 429 with TRIAL_LIMIT code when free user hits daily cap', async () => {
    const today = new Date().toISOString().split('T')[0];
    mocks.supabase.from.mockReturnValue(
      makeSupabaseBuilder({
        plan: 'student',
        trial_messages_today: 20,
        trial_messages_reset_date: today,
      })
    );
    const res = await POST(makeRequest({ messages: VALID_MESSAGES }, { Authorization: 'Bearer tok' }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe('TRIAL_LIMIT');
  });
});

// ─── Successful response ──────────────────────────────────────────────────────

describe('successful streaming response', () => {
  it('returns 200 with a streaming text/plain body', async () => {
    const res = await POST(makeRequest({ messages: VALID_MESSAGES }, { Authorization: 'Bearer tok' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(/text\/plain/);
  });

  it('streams the Claude response text to the client', async () => {
    const res = await POST(makeRequest({ messages: VALID_MESSAGES }, { Authorization: 'Bearer tok' }));
    const text = await res.text();
    expect(text).toBe('Hello from Claude');
  });
});
