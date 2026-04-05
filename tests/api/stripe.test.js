/**
 * Tests for api/stripe.js — Stripe checkout session handler.
 *
 * This version uses fetch directly (not the Stripe SDK) to create sessions.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

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

// Simulate a non-webhook POST request with bodyParser disabled (raw body stream).
function makeStreamReq(rawBody = '{}') {
  const emitter = new EventEmitter();
  const request = Object.assign(emitter, {
    method: 'POST',
    headers: {},   // no stripe-signature → non-webhook path
    body: undefined,
  });
  setImmediate(() => {
    emitter.emit('data', Buffer.from(rawBody));
    emitter.emit('end');
  });
  return request;
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
    global.fetch = vi.fn().mockImplementationOnce(() => {
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

// ─── Portal action ────────────────────────────────────────────────────────────

describe('portal action', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  it('returns 400 when email is missing', async () => {
    const r = res();
    await handler(req({ action: 'portal' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/email/i);
  });

  it('returns 404 when no Stripe customer is found for the email', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    const r = res();
    await handler(req({ action: 'portal', email: 'nobody@test.com' }), r);
    expect(r.statusCode).toBe(404);
    expect(r.body.error).toMatch(/no stripe customer/i);
  });

  it('returns the portal URL when customer is found', async () => {
    global.fetch = vi.fn()
      // Customer search
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'cus_abc123' }] }),
      })
      // Billing portal session creation
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://billing.stripe.com/session/abc' }),
      });

    const r = res();
    await handler(req({ action: 'portal', email: 'user@test.com' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.url).toBe('https://billing.stripe.com/session/abc');
  });

  it('returns error when portal session creation fails', async () => {
    global.fetch = vi.fn()
      // Customer search succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'cus_abc123' }] }),
      })
      // Portal session fails
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: 'No active subscriptions' } }),
      });

    const r = res();
    await handler(req({ action: 'portal', email: 'user@test.com' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/No active subscriptions/i);
  });

  it('returns 500 when fetch throws during portal lookup', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('network failure'));

    const r = res();
    await handler(req({ action: 'portal', email: 'user@test.com' }), r);
    expect(r.statusCode).toBe(500);
  });
});

// ─── Annual plan ──────────────────────────────────────────────────────────────

describe('annual plan', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_PRICE_STUDENT_ANNUAL = 'price_annual_test';
  });

  afterEach(() => {
    delete process.env.STRIPE_PRICE_STUDENT_ANNUAL;
  });

  it('uses the student_annual price when annual=true and plan=student', async () => {
    let capturedBody;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedBody = opts.body.toString();
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'cs_annual', url: 'https://stripe.com/annual' }),
      });
    });

    await handler(req({ plan: 'student', annual: true, email: 'user@test.com' }), res());
    expect(capturedBody).toContain('price_annual_test');
  });

  it('uses the regular student price when annual=false', async () => {
    process.env.STRIPE_PRICE_STUDENT = 'price_monthly_test';
    let capturedBody;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedBody = opts.body.toString();
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'cs_monthly', url: 'https://stripe.com/monthly' }),
      });
    });

    await handler(req({ plan: 'student', annual: false, email: 'user@test.com' }), res());
    expect(capturedBody).toContain('price_monthly_test');
    delete process.env.STRIPE_PRICE_STUDENT;
  });
});

// ─── Homeschool plan ──────────────────────────────────────────────────────────

describe('homeschool plan', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_PRICE_HOMESCHOOL = 'price_homeschool_test';
  });

  afterEach(() => {
    delete process.env.STRIPE_PRICE_HOMESCHOOL;
  });

  it('uses the homeschool price when plan=homeschool', async () => {
    let capturedBody;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedBody = opts.body.toString();
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'cs_homeschool', url: 'https://stripe.com/homeschool' }),
      });
    });

    const r = res();
    await handler(req({ plan: 'homeschool', email: 'parent@test.com' }), r);
    expect(r.statusCode).toBe(200);
    expect(capturedBody).toContain('price_homeschool_test');
  });
});

// ─── Raw-body / streamed request (bodyParser disabled) ───────────────────────
// These tests simulate the production path where Next.js/Vercel does NOT parse
// the request body because `export const config = { api: { bodyParser: false } }`
// is set.  The handler must read the raw stream and parse JSON itself.

describe('raw-body parsing (bodyParser disabled)', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  it('parses a valid JSON stream and proceeds to the checkout handler', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'cs_stream_ok', url: 'https://checkout.stripe.com/stream' }),
    });

    const r = res();
    await handler(
      makeStreamReq(JSON.stringify({ plan: 'student', email: 'stream@test.com' })),
      r,
    );
    expect(r.statusCode).toBe(200);
    expect(r.body.url).toBe('https://checkout.stripe.com/stream');
  });

  it('returns 400 when the streamed body is invalid JSON', async () => {
    const r = res();
    await handler(makeStreamReq('not-valid-json{{{'), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/invalid json/i);
  });

  it('treats an empty body stream as an empty object and proceeds', async () => {
    // Empty raw body falls back to '{}' via `raw.toString() || '{}'` → parses OK
    // → handler proceeds with an empty body (no plan/email) and calls Stripe API.
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'cs_empty', url: 'https://stripe.com/empty' }),
    });
    const r = res();
    await handler(makeStreamReq(''), r);
    // Should NOT return 400 (no JSON parse error); handler proceeds with {}
    expect(r.statusCode).not.toBe(400);
  });
});
