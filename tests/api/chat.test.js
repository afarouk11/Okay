/**
 * Tests for api/chat.js — Anthropic Claude AI chat proxy.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mock setup ───────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

  const supabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  };
  return { supabase };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mocks.supabase,
}));

import handler from '../../api/chat.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBuilder(resolution = { data: null, error: null }) {
  const b = {
    _r: resolution,
    then(res, rej) { return Promise.resolve(b._r).then(res, rej); },
  };
  ['select', 'eq', 'single'].forEach(m => {
    b[m] = vi.fn().mockReturnValue(b);
  });
  return b;
}

function req(body = {}, method = 'POST', headers = {}) {
  return {
    method,
    body,
    headers,
    socket: { remoteAddress: '127.0.0.1' },
  };
}

function res() {
  const r = { statusCode: 200, body: null };
  r.setHeader = () => r;
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (d) => { r.body = d; return r; };
  r.end = () => r;
  return r;
}

const VALID_MESSAGES = [{ role: 'user', content: 'Explain differentiation.' }];

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
  mocks.supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'No user' } });
  mocks.supabase.from.mockReturnValue(makeBuilder());
});

afterEach(() => {
  delete global.fetch;
});

// ─── OPTIONS preflight ────────────────────────────────────────────────────────

describe('OPTIONS preflight', () => {
  it('returns 200', async () => {
    const r = res();
    await handler(req({}, 'OPTIONS'), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── Non-POST method ─────────────────────────────────────────────────────────

describe('non-POST method', () => {
  it('returns 405 for GET', async () => {
    const r = res();
    await handler(req({}, 'GET'), r);
    expect(r.statusCode).toBe(405);
    expect(r.body.error).toMatch(/method not allowed/i);
  });
});

// ─── Missing ANTHROPIC_API_KEY ────────────────────────────────────────────────

describe('missing ANTHROPIC_API_KEY', () => {
  it('returns 500 when the env var is absent', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const r = res();
    await handler(req({ messages: VALID_MESSAGES }), r);
    expect(r.statusCode).toBe(500);
    expect(r.body.error).toMatch(/ANTHROPIC_API_KEY/i);
  });
});

// ─── Request body validation ──────────────────────────────────────────────────

describe('request body validation', () => {
  it('returns 400 when messages is absent', async () => {
    const r = res();
    await handler(req({}), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/messages/i);
  });

  it('returns 400 when messages is not an array', async () => {
    const r = res();
    await handler(req({ messages: 'not-an-array' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/messages/i);
  });

  it('returns 400 when messages has more than 50 items', async () => {
    const messages = Array.from({ length: 51 }, (_, i) => ({ role: 'user', content: `msg ${i}` }));
    const r = res();
    await handler(req({ messages }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/too many messages/i);
  });

  it('returns 400 when the serialised payload exceeds 100 KB', async () => {
    const messages = [{ role: 'user', content: 'x'.repeat(101_000) }];
    const r = res();
    await handler(req({ messages }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/too long/i);
  });
});

// ─── Successful Anthropic call ────────────────────────────────────────────────

describe('successful Anthropic call', () => {
  it('proxies the Anthropic response back to the caller', async () => {
    const anthropicReply = {
      id: 'msg_test',
      type: 'message',
      content: [{ type: 'text', text: 'Differentiation measures rate of change.' }],
    };
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(anthropicReply),
    });

    const r = res();
    await handler(req({ messages: VALID_MESSAGES }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body).toEqual(anthropicReply);
  });

  it('uses the caller-supplied model when provided', async () => {
    let capturedBody;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({ status: 200, json: () => Promise.resolve({}) });
    });

    await handler(req({ messages: VALID_MESSAGES, model: 'claude-3-haiku-20240307' }), res());
    expect(capturedBody.model).toBe('claude-3-haiku-20240307');
  });

  it('defaults to claude-sonnet-4-6 when no model is specified', async () => {
    let capturedBody;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({ status: 200, json: () => Promise.resolve({}) });
    });

    await handler(req({ messages: VALID_MESSAGES }), res());
    expect(capturedBody.model).toBe('claude-sonnet-4-6');
  });

  it('includes system prompt in the request when provided', async () => {
    let capturedBody;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({ status: 200, json: () => Promise.resolve({}) });
    });

    await handler(req({ messages: VALID_MESSAGES, system: 'You are a maths tutor.' }), res());
    expect(capturedBody.system).toBe('You are a maths tutor.');
  });

  it('omits system from the request when not provided', async () => {
    let capturedBody;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({ status: 200, json: () => Promise.resolve({}) });
    });

    await handler(req({ messages: VALID_MESSAGES }), res());
    expect(capturedBody).not.toHaveProperty('system');
  });
});

// ─── Anthropic API error responses ───────────────────────────────────────────

describe('Anthropic API error responses', () => {
  it('forwards non-200 status codes from Anthropic', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 529,
      json: () => Promise.resolve({ error: { type: 'overloaded_error', message: 'API overloaded' } }),
    });

    const r = res();
    await handler(req({ messages: VALID_MESSAGES }), r);
    expect(r.statusCode).toBe(529);
  });
});

// ─── Network error ────────────────────────────────────────────────────────────

describe('network error', () => {
  it('returns 500 when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const r = res();
    await handler(req({ messages: VALID_MESSAGES }), r);
    expect(r.statusCode).toBe(500);
    expect(r.body.error).toMatch(/failed to connect/i);
  });
});

// ─── Authenticated free user — per-user rate limit path ──────────────────────

describe('authenticated free user', () => {
  it('calls Anthropic successfully for an authenticated free user', async () => {
    mocks.supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-free-1' } },
      error: null,
    });
    mocks.supabase.from.mockReturnValueOnce(
      makeBuilder({ data: { subscription_status: 'free' }, error: null })
    );
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve({ content: [{ text: 'Hello' }] }),
    });

    const r = res();
    await handler(
      req({ messages: VALID_MESSAGES }, 'POST', { authorization: 'Bearer valid-free-token' }),
      r
    );
    expect(r.statusCode).toBe(200);
  });
});

// ─── Demo token — skips Supabase user lookup ─────────────────────────────────

describe('demo token', () => {
  it('skips user lookup for demo tokens and still calls Anthropic', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve({ content: [{ text: 'Demo response' }] }),
    });

    const r = res();
    await handler(
      req({ messages: VALID_MESSAGES }, 'POST', { authorization: 'Bearer demo_token_abc123' }),
      r
    );
    expect(r.statusCode).toBe(200);
    // Supabase auth should NOT have been called for demo tokens
    expect(mocks.supabase.auth.getUser).not.toHaveBeenCalled();
  });
});

// ─── Authenticated paid user ──────────────────────────────────────────────────

describe('authenticated paid user', () => {
  it('calls Anthropic without hitting daily rate limit for paid users', async () => {
    mocks.supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-paid-1' } },
      error: null,
    });
    mocks.supabase.from.mockReturnValueOnce(
      makeBuilder({ data: { subscription_status: 'active' }, error: null })
    );
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve({ content: [{ text: 'Paid user response' }] }),
    });

    const r = res();
    await handler(
      req({ messages: VALID_MESSAGES }, 'POST', { authorization: 'Bearer valid-paid-token' }),
      r
    );
    expect(r.statusCode).toBe(200);
  });
});
