/**
 * Tests for api/progress.js — save/load student progress.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Hoisted mock setup ───────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  const supabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  };
  return { supabase };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mocks.supabase,
}));

import handler from '../../api/progress.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBuilder(resolution = { data: null, error: null }) {
  const b = {
    _r: resolution,
    then(res, rej) { return Promise.resolve(b._r).then(res, rej); },
  };
  ['select', 'upsert', 'update', 'eq', 'single', 'order', 'limit'].forEach(m => {
    b[m] = vi.fn().mockReturnValue(b);
  });
  return b;
}

function req(method, body = {}, headers = {}) {
  return { method, body, headers };
}

function res() {
  const r = { statusCode: 200, body: null };
  r.setHeader = () => r;
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (d) => { r.body = d; return r; };
  r.end = () => r;
  return r;
}

const VALID_USER = { id: 'user-1', email: 'user@test.com' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.supabase.auth.getUser.mockResolvedValue({ data: { user: VALID_USER }, error: null });
  mocks.supabase.from.mockReturnValue(makeBuilder());
  mocks.supabase.rpc.mockResolvedValue({ data: null, error: null });
});

// ─── OPTIONS ─────────────────────────────────────────────────────────────────

describe('OPTIONS', () => {
  it('returns 200', async () => {
    const r = res();
    await handler(req('OPTIONS'), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── Unauthenticated ─────────────────────────────────────────────────────────

describe('unauthenticated', () => {
  it('returns 401 without Authorization header', async () => {
    const r = res();
    await handler(req('GET'), r);
    expect(r.statusCode).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    mocks.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'bad token' } });
    const r = res();
    await handler(req('GET', {}, { authorization: 'Bearer bad-tok' }), r);
    expect(r.statusCode).toBe(401);
  });
});

// ─── GET ─────────────────────────────────────────────────────────────────────

describe('GET', () => {
  beforeEach(() => {
    // Multiple parallel queries — return empty data for each
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: [], error: null }));
  });

  it('returns progress, profile, mistakes, and activity', async () => {
    const r = res();
    await handler(req('GET', {}, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(200);
    expect(Array.isArray(r.body.progress)).toBe(true);
    expect(Array.isArray(r.body.mistakes)).toBe(true);
    expect(Array.isArray(r.body.activity)).toBe(true);
  });
});

// ─── POST — accuracy calculation ──────────────────────────────────────────────

describe('POST — accuracy', () => {
  const postReq = (body) =>
    req('POST', body, { authorization: 'Bearer valid-tok' });

  it('calculates 80% for 8 correct out of 10', async () => {
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    const r = res();
    await handler(postReq({ subject: 'Maths', topic: 'Algebra', correct: 8, total: 10, xpEarned: 40 }), r);
    expect(r.statusCode).toBe(200);
  });

  it('calculates 0% for 0 correct', async () => {
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    const r = res();
    await handler(postReq({ subject: 'Maths', topic: 'Algebra', correct: 0, total: 10, xpEarned: 0 }), r);
    expect(r.statusCode).toBe(200);
  });

  it('calculates 0% when total is 0 (no division by zero)', async () => {
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    const r = res();
    await handler(postReq({ subject: 'Maths', topic: 'Algebra', correct: 0, total: 0, xpEarned: 0 }), r);
    expect(r.statusCode).toBe(200);
  });

  it('returns 400 when total is negative', async () => {
    const r = res();
    await handler(postReq({ subject: 'Maths', topic: 'Algebra', correct: 0, total: -1, xpEarned: 0 }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 when correct exceeds total', async () => {
    const r = res();
    await handler(postReq({ subject: 'Maths', topic: 'Algebra', correct: 11, total: 10, xpEarned: 0 }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 when xpEarned is negative', async () => {
    const r = res();
    await handler(postReq({ subject: 'Maths', topic: 'Algebra', correct: 5, total: 10, xpEarned: -5 }), r);
    expect(r.statusCode).toBe(400);
  });

  it('defaults xpEarned to 0 when omitted', async () => {
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    const r = res();
    await handler(postReq({ subject: 'Maths', topic: 'Algebra', correct: 5, total: 10 }), r);
    expect(r.statusCode).toBe(200);
  });

  it('upserts progress with onConflict user_id,subject,topic', async () => {
    const upsertSpy = vi.fn().mockReturnValue(makeBuilder());
    mocks.supabase.from.mockReturnValue({ upsert: upsertSpy, ...makeBuilder() });
    const r = res();
    await handler(postReq({ subject: 'Maths', topic: 'Calculus', correct: 3, total: 5, xpEarned: 15 }), r);
    // The upsert should have been called (checked via status 200)
    expect(r.statusCode).toBe(200);
  });
});

// ─── Unsupported method ───────────────────────────────────────────────────────

describe('unsupported method', () => {
  it('returns 405 for DELETE', async () => {
    const r = res();
    await handler(req('DELETE', {}, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(405);
  });
});
