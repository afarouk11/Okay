/**
 * Tests for api/resend.js — Resend email delivery endpoint.
 * This file is unique to the Okay repo.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import handler from '../../api/resend.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function req(body = {}, method = 'POST') {
  return { method, body, headers: {} };
}

function res() {
  const r = { statusCode: 200, body: null };
  r.setHeader = () => r;
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (d) => { r.body = d; return r; };
  r.end = () => r;
  return r;
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.RESEND_API_KEY;
  delete process.env.APP_URL;
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

// ─── Non-POST methods ─────────────────────────────────────────────────────────

describe('non-POST', () => {
  it('returns 405 for GET', async () => {
    const r = res();
    await handler(req({}, 'GET'), r);
    expect(r.statusCode).toBe(405);
  });
});

// ─── Missing RESEND_API_KEY ───────────────────────────────────────────────────

describe('missing RESEND_API_KEY', () => {
  it('returns 500 when key is not configured', async () => {
    const r = res();
    await handler(req({ to: 'user@test.com', type: 'welcome', name: 'Alice' }), r);
    expect(r.statusCode).toBe(500);
    expect(r.body.error).toMatch(/resend/i);
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('validation', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'resend-test-key';
  });

  it('returns 400 when recipient email (to) is missing', async () => {
    const r = res();
    await handler(req({ type: 'welcome', name: 'Alice' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/recipient/i);
  });
});

// ─── Email templates ──────────────────────────────────────────────────────────

describe('template rendering', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'resend-test-key';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'email-sent-123' }),
    });
  });

  it('sends a welcome email successfully', async () => {
    const r = res();
    await handler(req({ to: 'user@test.com', type: 'welcome', name: 'Alice' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.id).toBe('email-sent-123');
  });

  it('sends a trial_reminder email', async () => {
    const r = res();
    await handler(req({ to: 'user@test.com', type: 'trial_reminder', name: 'Alice' }), r);
    expect(r.statusCode).toBe(200);
  });

  it('sends a weekly report email with stats', async () => {
    const r = res();
    await handler(req({
      to: 'user@test.com',
      type: 'weekly',
      name: 'Alice',
      stats: { questions: 30, accuracy: 75, xp: 200, streak: 4 },
    }), r);
    expect(r.statusCode).toBe(200);
  });

  it('defaults to welcome template for unknown type', async () => {
    const r = res();
    await handler(req({ to: 'user@test.com', type: 'unknown_type', name: 'Alice' }), r);
    // Falls back to welcome template and sends
    expect(r.statusCode).toBe(200);
  });

  it('sends a password_reset email', async () => {
    const r = res();
    await handler(req({ to: 'user@test.com', type: 'password_reset', name: 'Alice' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.id).toBe('email-sent-123');
  });

  it('sends a goodbye email', async () => {
    const r = res();
    await handler(req({ to: 'user@test.com', type: 'goodbye', name: 'Alice' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.id).toBe('email-sent-123');
  });

  it('includes the recipient in the Resend request', async () => {
    let capturedBody;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'x' }) });
    });
    await handler(req({ to: 'user@test.com', type: 'welcome', name: 'Alice' }), res());
    expect(capturedBody.to).toContain('user@test.com');
  });

  it('sends from hello@synaptiqai.co.uk', async () => {
    let capturedBody;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'x' }) });
    });
    await handler(req({ to: 'user@test.com', type: 'welcome', name: 'Alice' }), res());
    expect(capturedBody.from).toContain('synaptiqai.co.uk');
  });
});

// ─── Resend API error ─────────────────────────────────────────────────────────

describe('Resend API error', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'resend-test-key';
  });

  it('returns appropriate error status when Resend returns a non-OK response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ message: 'Invalid email address' }),
    });
    const r = res();
    await handler(req({ to: 'user@test.com', type: 'welcome', name: 'Alice' }), r);
    expect(r.statusCode).toBe(422);
  });
});
