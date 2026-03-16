/**
 * Tests for api/email.js — email template rendering and delivery.
 *
 * This version of email.js has templates: welcome, payment_confirmed,
 * payment_failed, weekly, parent_report.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import handler from '../../api/email.js';

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
  process.env.SITE_URL = 'https://synaptiq.test';
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

// ─── Validation ───────────────────────────────────────────────────────────────

describe('input validation', () => {
  it('returns 400 when email is missing', async () => {
    const r = res();
    await handler(req({ type: 'welcome', name: 'Alice' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/email/i);
  });

  it('returns 400 for an invalid email format', async () => {
    const r = res();
    await handler(req({ type: 'welcome', email: 'not-an-email', name: 'Alice' }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    const r = res();
    await handler(req({ type: 'welcome', email: 'alice@test.com' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/name/i);
  });

  it('returns 400 for an unknown email type', async () => {
    const r = res();
    await handler(req({ type: 'nonexistent_type', email: 'alice@test.com', name: 'Alice' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/unknown/i);
  });
});

// ─── Dev mode (no RESEND_API_KEY) ─────────────────────────────────────────────

describe('dev mode — no RESEND_API_KEY', () => {
  const VALID_BASE = { email: 'alice@test.com', name: 'Alice' };

  it('returns success with preview HTML for welcome template', async () => {
    const r = res();
    await handler(req({ ...VALID_BASE, type: 'welcome' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.success).toBe(true);
    expect(typeof r.body.preview).toBe('string');
    expect(r.body.preview).toContain('Alice');
  });

  it('renders the payment_confirmed template', async () => {
    const r = res();
    await handler(req({ ...VALID_BASE, type: 'payment_confirmed', stats: { plan: 'student' } }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.preview).toBeDefined();
  });

  it('renders the weekly template with stats', async () => {
    const r = res();
    await handler(req({
      ...VALID_BASE,
      type: 'weekly',
      stats: { questions: 42, accuracy: 85, xp: 300, streak: 7 },
    }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.preview).toContain('42');
  });

  it('renders the weekly template with 0 defaults when stats are omitted', async () => {
    const r = res();
    await handler(req({ ...VALID_BASE, type: 'weekly' }), r);
    expect(r.statusCode).toBe(200);
    // Should not contain "undefined" in the rendered output
    expect(r.body.preview).not.toContain('undefined');
  });

  it('renders the parent_report template with the student name', async () => {
    const r = res();
    await handler(req({ ...VALID_BASE, type: 'parent_report', stats: { streak: 5, questions: 20, topics: 8, xp: 150 } }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.preview).toContain('Alice');
  });
});

// ─── Production mode (with RESEND_API_KEY) ───────────────────────────────────

describe('production mode — RESEND_API_KEY set', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'resend-key-test';
  });

  it('calls Resend API and returns the email id on success', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'email-id-abc' }),
    });

    const r = res();
    await handler(req({ email: 'alice@test.com', name: 'Alice', type: 'welcome' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.id).toBe('email-id-abc');
  });

  it('returns 500 when Resend throws a network error', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('network failure'));
    const r = res();
    await handler(req({ email: 'alice@test.com', name: 'Alice', type: 'welcome' }), r);
    expect(r.statusCode).toBe(500);
  });

  it('sends from hello@synaptiq.co.uk', async () => {
    let capturedBody;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'x' }) });
    });
    await handler(req({ email: 'alice@test.com', name: 'Alice', type: 'welcome' }), res());
    expect(capturedBody.from).toContain('hello@synaptiq.co.uk');
  });
});
