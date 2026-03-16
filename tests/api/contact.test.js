/**
 * Tests for api/contact.js — contact form handler.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import handler from '../../api/contact.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function req(body = {}, method = 'POST') {
  return {
    method,
    body,
    headers: { 'x-forwarded-for': '1.2.3.4' },
    socket: { remoteAddress: '1.2.3.4' },
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

const VALID_BODY = {
  name: 'Alice',
  email: 'alice@test.com',
  category: 'General support',
  message: 'This is a valid test message',
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.RESEND_API_KEY;
});

afterEach(() => {
  delete process.env.RESEND_API_KEY;
});

// ─── OPTIONS ─────────────────────────────────────────────────────────────────

describe('OPTIONS', () => {
  it('returns 200', async () => {
    const r = res();
    await handler(req({}, 'OPTIONS'), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── Non-POST method ─────────────────────────────────────────────────────────

describe('non-POST', () => {
  it('returns 405 for GET', async () => {
    const r = res();
    await handler(req({}, 'GET'), r);
    expect(r.statusCode).toBe(405);
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('validation', () => {
  it('returns 400 when name is missing', async () => {
    const r = res();
    await handler(req({ ...VALID_BODY, name: '' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/name/i);
  });

  it('returns 400 for an invalid email', async () => {
    const r = res();
    await handler(req({ ...VALID_BODY, email: 'not-an-email' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/email/i);
  });

  it('returns 400 when message is too short (under 10 chars)', async () => {
    const r = res();
    await handler(req({ ...VALID_BODY, message: 'short' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/message/i);
  });

  it('returns 400 when message exceeds 5000 characters', async () => {
    const r = res();
    await handler(req({ ...VALID_BODY, message: 'x'.repeat(5001) }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/message/i);
  });

  it('returns 400 for an invalid category', async () => {
    const r = res();
    await handler(req({ ...VALID_BODY, category: 'Mystery category' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/category/i);
  });
});

// ─── Dev mode (no RESEND_API_KEY) ─────────────────────────────────────────────

describe('dev mode — no RESEND_API_KEY', () => {
  it('acknowledges without sending when key is absent', async () => {
    const r = res();
    await handler(req(VALID_BODY), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.success).toBe(true);
  });
});

// ─── Production mode (with RESEND_API_KEY) ───────────────────────────────────

describe('production mode — RESEND_API_KEY set', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'resend-key-test';
  });

  it('returns 200 when Resend accepts the email', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'email-abc' }),
    });
    const r = res();
    await handler(req(VALID_BODY), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('returns 500 when Resend returns a non-OK response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Service error' }),
    });
    const r = res();
    await handler(req(VALID_BODY), r);
    expect(r.statusCode).toBe(500);
  });

  it('defaults to "General support" category when omitted', async () => {
    let capturedBody;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'x' }) });
    });
    const { category: _omitted, ...bodyWithoutCategory } = VALID_BODY;
    await handler(req(bodyWithoutCategory), res());
    expect(capturedBody.subject).toContain('General support');
  });
});
