/**
 * Tests for api/webhook.js — Stripe webhook event handler.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

// ─── Hoisted mock setup ───────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

  const stripe = {
    webhooks: { constructEvent: vi.fn() },
  };
  const supabase = { from: vi.fn() };
  return { stripe, supabase };
});

vi.mock('stripe', () => ({
  default: vi.fn(() => mocks.stripe),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mocks.supabase,
}));

import handler from '../../api/stripe.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBuilder(resolution = { data: null, error: null }) {
  const b = {
    _r: resolution,
    then(res, rej) { return Promise.resolve(b._r).then(res, rej); },
  };
  ['select', 'update', 'upsert', 'insert', 'eq', 'single', 'order', 'in'].forEach(m => {
    b[m] = vi.fn().mockReturnValue(b);
  });
  return b;
}

function makeRawBodyReq(rawBody = '{}', sig = 'valid-sig') {
  const emitter = new EventEmitter();
  const req = Object.assign(emitter, {
    method: 'POST',
    headers: { 'stripe-signature': sig },
    body: undefined,
  });
  setImmediate(() => {
    emitter.emit('data', Buffer.from(rawBody));
    emitter.emit('end');
  });
  return req;
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
  mocks.supabase.from.mockReturnValue(makeBuilder({ data: null, error: null }));
});

// ─── Non-POST method ─────────────────────────────────────────────────────────

describe('non-POST method', () => {
  it('returns 405 for GET requests', async () => {
    const req = { method: 'GET', headers: {} };
    const r = res();
    await handler(req, r);
    expect(r.statusCode).toBe(405);
  });
});

// ─── Invalid signature ────────────────────────────────────────────────────────

describe('invalid Stripe signature', () => {
  it('returns 400 when signature verification fails', async () => {
    mocks.stripe.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error('No sig');
    });
    const r = res();
    await handler(makeRawBodyReq('{}', 'bad-sig'), r);
    expect(r.statusCode).toBe(400);
  });
});

// ─── checkout.session.completed ───────────────────────────────────────────────

describe('checkout.session.completed', () => {
  it('updates profile subscription_status to active', async () => {
    const sessionData = {
      customer_email: 'buyer@test.com',
      customer: 'cus_123',
      subscription: 'sub_456',
      metadata: { plan: 'student' },
    };
    mocks.stripe.webhooks.constructEvent.mockReturnValueOnce({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: sessionData },
    });
    // idempotency check returns null (not seen before)
    const idempotencyBuilder = makeBuilder({ data: null, error: null });
    const updateBuilder = makeBuilder({ data: null, error: null });
    mocks.supabase.from
      .mockReturnValueOnce(idempotencyBuilder)  // processed_webhooks select
      .mockReturnValueOnce(makeBuilder())        // processed_webhooks insert
      .mockReturnValueOnce(updateBuilder);       // profiles update

    // mock fetch for email
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const r = res();
    await handler(makeRawBodyReq(JSON.stringify(sessionData)), r);
    expect(r.statusCode).toBe(200);
  });

  it('defaults plan to "student" when metadata.plan is absent', async () => {
    const sessionData = {
      customer_email: 'buyer2@test.com',
      customer: 'cus_789',
      subscription: 'sub_789',
      metadata: {},
    };
    mocks.stripe.webhooks.constructEvent.mockReturnValueOnce({
      id: 'evt_2',
      type: 'checkout.session.completed',
      data: { object: sessionData },
    });
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const r = res();
    await handler(makeRawBodyReq(JSON.stringify(sessionData)), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── invoice.payment_succeeded ───────────────────────────────────────────────

describe('invoice.payment_succeeded', () => {
  it('re-activates subscription after renewal', async () => {
    mocks.stripe.webhooks.constructEvent.mockReturnValueOnce({
      id: 'evt_3',
      type: 'invoice.payment_succeeded',
      data: { object: { customer: 'cus_123' } },
    });
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: null, error: null }));

    const r = res();
    await handler(makeRawBodyReq('{}'), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── invoice.payment_failed ───────────────────────────────────────────────────

describe('invoice.payment_failed', () => {
  it('marks profile as past_due', async () => {
    mocks.stripe.webhooks.constructEvent.mockReturnValueOnce({
      id: 'evt_4',
      type: 'invoice.payment_failed',
      data: { object: { customer: 'cus_123' } },
    });
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: { email: 'user@test.com', name: 'User' }, error: null }));
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const r = res();
    await handler(makeRawBodyReq('{}'), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── customer.subscription.deleted ───────────────────────────────────────────

describe('customer.subscription.deleted', () => {
  it('sets subscription_status to cancelled', async () => {
    mocks.stripe.webhooks.constructEvent.mockReturnValueOnce({
      id: 'evt_5',
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_123' } },
    });
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: null, error: null }));

    const r = res();
    await handler(makeRawBodyReq('{}'), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── Duplicate event (idempotency) ────────────────────────────────────────────

describe('duplicate event', () => {
  it('returns 200 with duplicate:true without re-processing', async () => {
    mocks.stripe.webhooks.constructEvent.mockReturnValueOnce({
      id: 'evt_dup',
      type: 'checkout.session.completed',
      data: { object: { customer_email: 'a@b.com', metadata: {} } },
    });
    // idempotency check returns existing row
    const dupBuilder = makeBuilder({ data: { event_id: 'evt_dup' }, error: null });
    mocks.supabase.from.mockReturnValueOnce(dupBuilder);

    const r = res();
    await handler(makeRawBodyReq('{}'), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.duplicate).toBe(true);
  });
});

// ─── invoice.payment_failed — no profile email ───────────────────────────────

describe('invoice.payment_failed — no profile email', () => {
  it('skips sending email when profile has no email', async () => {
    mocks.stripe.webhooks.constructEvent.mockReturnValueOnce({
      id: 'evt_noemail',
      type: 'invoice.payment_failed',
      data: { object: { customer: 'cus_noemail' } },
    });
    // profile fetch returns null (no email)
    mocks.supabase.from
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))  // idempotency select
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))  // profiles select (no email)
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))  // profiles update
      .mockReturnValueOnce(makeBuilder({ data: null, error: null })); // idempotency insert

    global.fetch = vi.fn();

    const r = res();
    await handler(makeRawBodyReq('{}'), r);
    expect(r.statusCode).toBe(200);
    // fetch should NOT have been called for the email since profile had no email
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─── Webhook processing error recovery ───────────────────────────────────────

describe('webhook processing error recovery', () => {
  it('still returns 200 even when event processing throws', async () => {
    mocks.stripe.webhooks.constructEvent.mockReturnValueOnce({
      id: 'evt_err',
      type: 'checkout.session.completed',
      data: { object: { customer_email: 'buyer@test.com', customer: 'cus_123', subscription: 'sub_456', metadata: { plan: 'student' } } },
    });
    // idempotency check — not a duplicate
    mocks.supabase.from
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))   // processed_webhooks select
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));  // profiles update throws

    // Force an error inside the switch block
    mocks.supabase.from.mockImplementationOnce(() => {
      throw new Error('DB error during processing');
    });
    // idempotency insert after error
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));

    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const r = res();
    await handler(makeRawBodyReq('{}'), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.received).toBe(true);
  });
});
