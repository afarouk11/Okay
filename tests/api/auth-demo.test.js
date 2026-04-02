/**
 * Tests for the demo mode (handleDemoMode) of api/auth.js.
 *
 * This file does NOT set SUPABASE_URL / SUPABASE_SERVICE_KEY so the module
 * initialises with supabase = null and all requests hit handleDemoMode.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Hoisted setup — no Supabase env vars ─────────────────────────────────────
// vi.hoisted runs before module imports, so clearing the vars here ensures that
// the module-level `createClient` guard is never triggered.

vi.hoisted(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => null,
}));

import handler from '../../api/auth.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Demo signup ──────────────────────────────────────────────────────────────

describe('demo signup', () => {
  it('returns a demo token and user on valid signup', async () => {
    const r = res();
    await handler(req({ action: 'signup', email: 'demo@b.com', password: 'pass1234', name: 'Demo' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.token).toMatch(/^demo_token_/);
    expect(r.body.user.name).toBe('Demo');
  });

  it('returns 400 for invalid email', async () => {
    const r = res();
    await handler(req({ action: 'signup', email: 'bad', password: 'pass1234', name: 'Demo' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/email/i);
  });

  it('returns 400 for short password', async () => {
    const r = res();
    await handler(req({ action: 'signup', email: 'demo@b.com', password: 'abc', name: 'Demo' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/password/i);
  });

  it('returns 400 for missing name', async () => {
    const r = res();
    await handler(req({ action: 'signup', email: 'demo@b.com', password: 'pass1234', name: '' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/name/i);
  });

  it('returns 400 for whitespace-only name', async () => {
    const r = res();
    await handler(req({ action: 'signup', email: 'demo@b.com', password: 'pass1234', name: '   ' }), r);
    expect(r.statusCode).toBe(400);
  });
});

// ─── Demo login ───────────────────────────────────────────────────────────────

describe('demo login', () => {
  it('returns a demo token and user on valid login', async () => {
    const r = res();
    await handler(req({ action: 'login', email: 'demo@b.com', password: 'pass1234' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.token).toMatch(/^demo_token_/);
  });

  it('returns 400 for invalid email', async () => {
    const r = res();
    await handler(req({ action: 'login', email: 'bad', password: 'pass1234' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/email/i);
  });

  it('returns 400 for missing password', async () => {
    const r = res();
    await handler(req({ action: 'login', email: 'demo@b.com', password: '' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/password/i);
  });
});

// ─── Demo verify ──────────────────────────────────────────────────────────────

describe('demo verify', () => {
  it('returns demo user without requiring a token', async () => {
    const r = res();
    await handler(req({ action: 'verify' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.user.id).toBe('demo');
  });
});

// ─── Demo reset ───────────────────────────────────────────────────────────────

describe('demo reset', () => {
  it('returns success for any email', async () => {
    const r = res();
    await handler(req({ action: 'reset', email: 'demo@b.com' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.success).toBe(true);
  });
});

// ─── Demo update_profile ──────────────────────────────────────────────────────

describe('demo update_profile', () => {
  it('returns success with provided profile fields', async () => {
    const r = res();
    await handler(req({ action: 'update_profile', name: 'Updated Name' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.profile.name).toBe('Updated Name');
  });
});

// ─── Demo delete_account ──────────────────────────────────────────────────────

describe('demo delete_account', () => {
  it('returns success', async () => {
    const r = res();
    await handler(req({ action: 'delete_account' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.success).toBe(true);
  });
});

// ─── Demo unknown action ──────────────────────────────────────────────────────

describe('demo unknown action', () => {
  it('returns 400 for an unknown action', async () => {
    const r = res();
    await handler(req({ action: 'fly_to_moon' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/unknown/i);
  });
});
