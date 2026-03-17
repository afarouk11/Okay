/**
 * Tests for api/auth.js
 *
 * @supabase/supabase-js is mocked via vi.hoisted() so the module-level
 * `createClient(...)` call in auth.js receives our stub.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Hoisted mock setup ───────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  const supabase = {
    auth: {
      admin: { createUser: vi.fn(), inviteUserByEmail: vi.fn() },
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(),
  };
  return { supabase };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mocks.supabase,
}));

import handler from '../../api/auth.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBuilder(resolution = { data: null, error: null }) {
  const b = {
    _r: resolution,
    then(res, rej) { return Promise.resolve(b._r).then(res, rej); },
  };
  ['select', 'insert', 'update', 'upsert', 'eq', 'single', 'order', 'limit'].forEach(m => {
    b[m] = vi.fn().mockReturnValue(b);
  });
  return b;
}

function req(body = {}, method = 'POST', headers = {}) {
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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.supabase.from.mockReturnValue(makeBuilder());
  process.env.SITE_URL = 'https://synaptiq.test';
});

// ─── OPTIONS ─────────────────────────────────────────────────────────────────

describe('OPTIONS preflight', () => {
  it('returns 200', async () => {
    const r = res();
    await handler(req({}, 'OPTIONS'), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── Missing action ───────────────────────────────────────────────────────────

describe('missing action', () => {
  it('returns 400 when action is absent', async () => {
    const r = res();
    await handler(req({}), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/action/i);
  });
});

// ─── Signup ───────────────────────────────────────────────────────────────────

describe('signup', () => {
  it('returns 400 for missing email', async () => {
    const r = res();
    await handler(req({ action: 'signup', password: 'pass1234', name: 'Alice' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/email/i);
  });

  it('returns 400 for invalid email format', async () => {
    const r = res();
    await handler(req({ action: 'signup', email: 'bad-email', password: 'pass1234', name: 'Alice' }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const r = res();
    await handler(req({ action: 'signup', email: 'a@b.com', password: 'abc', name: 'Alice' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/password/i);
  });

  it('returns 400 for empty name', async () => {
    const r = res();
    await handler(req({ action: 'signup', email: 'a@b.com', password: 'pass1234', name: '   ' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/name/i);
  });

  it('returns 400 for invalid plan', async () => {
    const r = res();
    await handler(req({ action: 'signup', email: 'a@b.com', password: 'pass1234', name: 'Alice', plan: 'vip' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/plan/i);
  });

  it('creates user and returns 200 on success', async () => {
    mocks.supabase.auth.admin.createUser.mockResolvedValueOnce({
      data: { user: { id: 'u1', email: 'a@b.com' } }, error: null,
    });
    const r = res();
    await handler(req({ action: 'signup', email: 'a@b.com', password: 'pass1234', name: 'Alice' }), r);
    expect(r.statusCode).toBe(200);
  });

  it('returns 400 on duplicate email from Supabase', async () => {
    mocks.supabase.auth.admin.createUser.mockResolvedValueOnce({
      data: null, error: { message: 'User already registered' },
    });
    const r = res();
    await handler(req({ action: 'signup', email: 'dup@b.com', password: 'pass1234', name: 'Alice' }), r);
    expect(r.statusCode).toBe(400);
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe('login', () => {
  it('returns 401 for bad credentials', async () => {
    mocks.supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: null, error: { message: 'Invalid login credentials' },
    });
    const r = res();
    await handler(req({ action: 'login', email: 'a@b.com', password: 'wrong' }), r);
    expect(r.statusCode).toBe(401);
  });

  it('returns 200 and a token on success', async () => {
    const today = new Date().toISOString().split('T')[0];
    mocks.supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        session: { access_token: 'tok-xyz' },
        user: { id: 'u1', email: 'a@b.com', user_metadata: { name: 'Alice' } },
      },
      error: null,
    });
    // profile fetch — returns existing profile with today's last_active to skip streak update
    mocks.supabase.from.mockReturnValueOnce(
      makeBuilder({ data: { id: 'u1', name: 'Alice', last_active: today, streak: 5, longest_streak: 10 }, error: null })
    );
    // streak update call
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    const r = res();
    await handler(req({ action: 'login', email: 'a@b.com', password: 'pass1234' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.token).toBe('tok-xyz');
  });
});

// ─── Reset ────────────────────────────────────────────────────────────────────

describe('reset', () => {
  it('returns 400 for missing email', async () => {
    const r = res();
    await handler(req({ action: 'reset' }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 200 for a valid reset request', async () => {
    mocks.supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: null });
    const r = res();
    await handler(req({ action: 'reset', email: 'a@b.com' }), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── Home plan ────────────────────────────────────────────────────────────────

describe('home plan signup', () => {
  it('accepts home plan and creates user', async () => {
    mocks.supabase.auth.admin.createUser.mockResolvedValueOnce({
      data: { user: { id: 'u2', email: 'parent@home.com' } }, error: null,
    });
    const r = res();
    await handler(req({ action: 'signup', email: 'parent@home.com', password: 'pass1234', name: 'Parent', plan: 'home' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('accepts homeschool plan and creates user', async () => {
    mocks.supabase.auth.admin.createUser.mockResolvedValueOnce({
      data: { user: { id: 'u3', email: 'teacher@school.com' } }, error: null,
    });
    const r = res();
    await handler(req({ action: 'signup', email: 'teacher@school.com', password: 'pass1234', name: 'Teacher', plan: 'homeschool' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('rejects unknown plan values', async () => {
    const r = res();
    await handler(req({ action: 'signup', email: 'a@b.com', password: 'pass1234', name: 'Alice', plan: 'vip' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/plan/i);
  });
});

// ─── Verify ───────────────────────────────────────────────────────────────────

describe('verify', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const r = res();
    await handler(req({ action: 'verify' }, 'POST', {}), r);
    expect(r.statusCode).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    mocks.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid token' } });
    const r = res();
    await handler(req({ action: 'verify' }, 'POST', { authorization: 'Bearer bad-token' }), r);
    expect(r.statusCode).toBe(401);
  });

  it('returns 200 with user data for a valid token', async () => {
    mocks.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null });
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: { id: 'u1', name: 'Alice' }, error: null }));
    const r = res();
    await handler(req({ action: 'verify' }, 'POST', { authorization: 'Bearer valid-token' }), r);
    expect(r.statusCode).toBe(200);
  });
});
