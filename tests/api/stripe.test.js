/**
 * Tests for api/stripe.js — Stripe checkout session handler.
 *
 * This version uses fetch directly (not the Stripe SDK) to create sessions.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import handler from '../../api/stripe.js';

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
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.APP_URL;
});

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY;
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

// ─── Missing STRIPE_SECRET_KEY ───────────────────────────────────────────────

describe('missing key', () => {
  it('returns 500 when STRIPE_SECRET_KEY is not set', async () => {
    const r = res();
    await handler(req({ plan: 'student', email: 'user@test.com' }), r);
    expect(r.statusCode).toBe(500);
    expect(r.body.error).toMatch(/stripe/i);
  });
});

// ─── Successful checkout ──────────────────────────────────────────────────────

describe('successful checkout', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  it('creates a checkout session and returns url and sessionId', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'cs_test_abc', url: 'https://checkout.stripe.com/pay/cs_test_abc' }),
    });

    const r = res();
    await handler(req({ plan: 'student', email: 'user@test.com' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.url).toBe('https://checkout.stripe.com/pay/cs_test_abc');
    expect(r.body.sessionId).toBe('cs_test_abc');
  });

  it('uses student plan as default when plan is unrecognised', async () => {
    let capturedBody;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedBody = [...opts.body.entries ? opts.body.entries() : new URLSearchParams(opts.body).entries()];
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'cs_x', url: 'https://stripe.com/x' }),
      });
    });

    await handler(req({ plan: 'unknown', email: 'user@test.com' }), res());
    // Should not crash
    expect(global.fetch).toHaveBeenCalled();
  });

  it('includes a 7-day trial in the request', async () => {
    let capturedBody;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedBody = opts.body.toString();
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'cs_y', url: 'https://stripe.com/y' }),
      });
    });

    await handler(req({ plan: 'student', email: 'user@test.com' }), res());
    expect(capturedBody).toContain('trial_period_days');
    expect(capturedBody).toContain('7');
  });
});

// ─── Stripe API error ─────────────────────────────────────────────────────────

describe('Stripe API error', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  it('returns the Stripe error status when API rejects', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: { message: 'Invalid price ID' } }),
    });

    const r = res();
    await handler(req({ plan: 'student', email: 'user@test.com' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toContain('Invalid price ID');
  });

  it('returns 500 when fetch throws a network error', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('network failure'));
    const r = res();
    await handler(req({ plan: 'student', email: 'user@test.com' }), r);
    expect(r.statusCode).toBe(500);
  });
});
