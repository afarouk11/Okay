/**
 * Tests for api/supabase-auth.js — Supabase auth & profile proxy.
 * All external fetch calls are mocked via global.fetch.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import handler from '../../api/supabase-auth.js';

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

function mockFetch(data, ok = true, status = 200) {
  return vi.fn().mockResolvedValueOnce({
    ok, status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'svc-key';
  process.env.SUPABASE_ANON_KEY = 'anon-key';
});

afterEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
});

// ─── OPTIONS ──────────────────────────────────────────────────────────────────

describe('OPTIONS', () => {
  it('returns 200', async () => {
    const r = res();
    await handler(req({}, 'OPTIONS'), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── Non-POST ─────────────────────────────────────────────────────────────────

describe('non-POST', () => {
  it('returns 405 for GET', async () => {
    const r = res();
    await handler(req({}, 'GET'), r);
    expect(r.statusCode).toBe(405);
  });
});

// ─── Missing Supabase config ──────────────────────────────────────────────────

describe('missing config', () => {
  it('returns 500 when SUPABASE_URL is absent', async () => {
    delete process.env.SUPABASE_URL;
    const r = res();
    await handler(req({ action: 'create_auth_user' }), r);
    expect(r.statusCode).toBe(500);
    expect(r.body.error).toMatch(/supabase/i);
  });

  it('returns 500 when SUPABASE_SERVICE_KEY is absent', async () => {
    delete process.env.SUPABASE_SERVICE_KEY;
    const r = res();
    await handler(req({ action: 'create_auth_user' }), r);
    expect(r.statusCode).toBe(500);
  });
});

// ─── create_auth_user ─────────────────────────────────────────────────────────

describe('create_auth_user', () => {
  it('returns 400 when email or password is missing', async () => {
    const r = res();
    await handler(req({ action: 'create_auth_user', payload: { email: 'a@b.com' } }), r);
    expect(r.statusCode).toBe(400);
  });

  it('creates a user and returns id + email', async () => {
    global.fetch = mockFetch({ id: 'uid-1', email: 'a@b.com' });
    const r = res();
    await handler(req({ action: 'create_auth_user', payload: { email: 'a@b.com', password: 'pw' } }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.id).toBe('uid-1');
    expect(r.body.email).toBe('a@b.com');
  });

  it('returns upstream error status on failure', async () => {
    global.fetch = mockFetch({ message: 'Already exists' }, false, 422);
    const r = res();
    await handler(req({ action: 'create_auth_user', payload: { email: 'a@b.com', password: 'pw' } }), r);
    expect(r.statusCode).toBe(422);
  });
});

// ─── verify_login ─────────────────────────────────────────────────────────────

describe('verify_login', () => {
  it('returns 400 when email or password is missing', async () => {
    const r = res();
    await handler(req({ action: 'verify_login', payload: { email: 'a@b.com' } }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 500 when SUPABASE_ANON_KEY is missing', async () => {
    delete process.env.SUPABASE_ANON_KEY;
    const r = res();
    await handler(req({ action: 'verify_login', payload: { email: 'a@b.com', password: 'pw' } }), r);
    expect(r.statusCode).toBe(500);
  });

  it('returns 401 on invalid credentials', async () => {
    global.fetch = mockFetch({ error: 'invalid_grant', error_description: 'Invalid login' }, false, 400);
    const r = res();
    await handler(req({ action: 'verify_login', payload: { email: 'a@b.com', password: 'bad' } }), r);
    expect(r.statusCode).toBe(401);
  });

  it('returns profile on success', async () => {
    const profile = { id: 'uid-1', email: 'a@b.com', name: 'Alice', plan: 'free' };
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ user: { id: 'uid-1' } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([profile]) });
    const r = res();
    await handler(req({ action: 'verify_login', payload: { email: 'a@b.com', password: 'pw' } }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.email).toBe('a@b.com');
  });

  it('creates a minimal profile when none exists', async () => {
    const created = [{ id: 'uid-1', email: 'a@b.com', name: 'a', plan: 'free' }];
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ user: { id: 'uid-1' } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(created) });
    const r = res();
    await handler(req({ action: 'verify_login', payload: { email: 'a@b.com', password: 'pw' } }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.email).toBe('a@b.com');
  });
});

// ─── forgot_password ──────────────────────────────────────────────────────────

describe('forgot_password', () => {
  it('returns 400 when email is missing', async () => {
    const r = res();
    await handler(req({ action: 'forgot_password', payload: {} }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 500 when SUPABASE_ANON_KEY is missing', async () => {
    delete process.env.SUPABASE_ANON_KEY;
    const r = res();
    await handler(req({ action: 'forgot_password', payload: { email: 'a@b.com' } }), r);
    expect(r.statusCode).toBe(500);
  });

  it('returns 200 (always, to prevent email enumeration)', async () => {
    global.fetch = mockFetch({});
    const r = res();
    await handler(req({ action: 'forgot_password', payload: { email: 'a@b.com' } }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.ok).toBe(true);
  });
});

// ─── upsert_profile ───────────────────────────────────────────────────────────

describe('upsert_profile', () => {
  it('upserts and returns the profile', async () => {
    const profile = { id: 'uid-1', email: 'a@b.com' };
    global.fetch = mockFetch([profile], true, 200);
    const r = res();
    await handler(req({ action: 'upsert_profile', payload: profile }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.id).toBe('uid-1');
  });
});

// ─── patch_profile ────────────────────────────────────────────────────────────

describe('patch_profile', () => {
  it('returns 400 when id is missing', async () => {
    const r = res();
    await handler(req({ action: 'patch_profile', payload: { name: 'Bob' } }), r);
    expect(r.statusCode).toBe(400);
  });

  it('patches and returns the profile', async () => {
    const updated = [{ id: 'uid-1', name: 'Bob' }];
    global.fetch = mockFetch(updated, true, 200);
    const r = res();
    await handler(req({ action: 'patch_profile', payload: { id: 'uid-1', name: 'Bob' } }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.name).toBe('Bob');
  });
});

// ─── get_profile ──────────────────────────────────────────────────────────────

describe('get_profile', () => {
  it('returns the profile by email', async () => {
    const profile = { id: 'uid-1', email: 'a@b.com' };
    global.fetch = mockFetch([profile], true, 200);
    const r = res();
    await handler(req({ action: 'get_profile', payload: { email: 'a@b.com' } }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.id).toBe('uid-1');
  });
});

// ─── save_upload ──────────────────────────────────────────────────────────────

describe('save_upload', () => {
  it('saves and returns the resource', async () => {
    const resource = { id: 'res-1', url: 'https://example.com/file.pdf' };
    global.fetch = mockFetch(resource, true, 200);
    const r = res();
    await handler(req({ action: 'save_upload', payload: resource }), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── get_uploads ──────────────────────────────────────────────────────────────

describe('get_uploads', () => {
  it('returns 400 when userId is missing', async () => {
    const r = res();
    await handler(req({ action: 'get_uploads' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/userId/i);
  });

  it('returns uploads for a user', async () => {
    const uploads = [{ id: 'res-1' }, { id: 'res-2' }];
    global.fetch = mockFetch(uploads, true, 200);
    const r = res();
    await handler(req({ action: 'get_uploads', userId: 'uid-1' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.data).toHaveLength(2);
  });
});

// ─── Unknown action ───────────────────────────────────────────────────────────

describe('unknown action', () => {
  it('returns 400', async () => {
    const r = res();
    await handler(req({ action: 'do_something_weird' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/unknown action/i);
  });
});

// ─── Internal error ───────────────────────────────────────────────────────────

describe('internal error', () => {
  it('returns 500 on unexpected fetch throw', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('network down'));
    const r = res();
    await handler(req({ action: 'create_auth_user', payload: { email: 'a@b.com', password: 'pw' } }), r);
    expect(r.statusCode).toBe(500);
  });
});
