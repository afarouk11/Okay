/**
 * Tests for export functionality in api/notes.js — GDPR data export endpoint.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Hoisted mock setup ───────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  const supabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  };
  return { supabase };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mocks.supabase,
}));

import handler from '../../api/notes.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBuilder(resolution = { data: [], error: null }) {
  const b = {
    _r: resolution,
    then(res, rej) { return Promise.resolve(b._r).then(res, rej); },
  };
  ['select', 'eq', 'order', 'limit'].forEach(m => {
    b[m] = vi.fn().mockReturnValue(b);
  });
  return b;
}

function req(method = 'GET', headers = {}) {
  return { method, headers, query: { action: 'export' }, socket: { remoteAddress: '1.2.3.4' } };
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

  it('returns 401 for invalid token', async () => {
    mocks.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'bad token' } });
    const r = res();
    await handler(req('GET', { authorization: 'Bearer bad-tok' }), r);
    expect(r.statusCode).toBe(401);
  });
});

// ─── Successful export ────────────────────────────────────────────────────────

describe('successful export', () => {
  it('returns a JSON export with all expected table keys', async () => {
    // Multiple table queries all return empty arrays
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: [], error: null }));

    const r = res();
    await handler(req('GET', { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.user_id).toBe(VALID_USER.id);
    expect(r.body.email).toBe(VALID_USER.email);
    expect(typeof r.body.exported_at).toBe('string');
    expect(r.body.data).toBeDefined();
  });

  it('includes all expected tables in the export', async () => {
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: [], error: null }));

    const r = res();
    await handler(req('GET', { authorization: 'Bearer valid-tok' }), r);

    const expectedTables = ['profiles', 'progress', 'notes', 'flashcards', 'mistakes'];
    for (const table of expectedTables) {
      expect(r.body.data).toHaveProperty(table);
    }
  });

  it('returns empty arrays for tables with no data (no null crash)', async () => {
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: null, error: null }));

    const r = res();
    await handler(req('GET', { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── Network / unexpected error ───────────────────────────────────────────────

describe('error handling', () => {
  it('returns a friendly message for network-related errors', async () => {
    mocks.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null });
    // Make one of the table fetches throw a network error
    mocks.supabase.from.mockImplementationOnce(() => {
      throw new Error('fetch failed: ECONNREFUSED');
    });

    const r = res();
    await handler(req('GET', { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(500);
    expect(r.body.error).toMatch(/Unable to reach the database/i);
  });

  it('returns the raw error message for non-network errors', async () => {
    mocks.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null });
    mocks.supabase.from.mockImplementationOnce(() => {
      throw new Error('Unexpected DB crash');
    });

    const r = res();
    await handler(req('GET', { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(500);
    expect(r.body.error).toMatch(/Unexpected DB crash/i);
  });
});
