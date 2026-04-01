/**
 * Tests for api/admin.js — admin dashboard API.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Hoisted mock setup ───────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  process.env.ADMIN_SECRET_KEY = 'admin-secret-test';
  const supabase = {
    from: vi.fn(),
    auth: {
      admin: {
        listUsers: vi.fn(),
        deleteUser: vi.fn(),
      },
    },
  };
  return { supabase };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mocks.supabase,
}));

import handler from '../../api/admin.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBuilder(resolution = { data: null, error: null, count: null }) {
  const b = {
    _r: resolution,
    then(res, rej) { return Promise.resolve(b._r).then(res, rej); },
  };
  ['select', 'update', 'insert', 'delete', 'eq', 'in', 'gte', 'order', 'range', 'single'].forEach(m => {
    b[m] = vi.fn().mockReturnValue(b);
  });
  return b;
}

function req(method = 'POST', body = {}, headers = {}, query = {}) {
  return { method, body, headers, query };
}

function res() {
  const r = { statusCode: 200, body: null };
  r.setHeader = () => r;
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (d) => { r.body = d; return r; };
  r.end = () => r;
  return r;
}

const ADMIN_HEADERS = { 'x-admin-key': 'admin-secret-test' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.supabase.from.mockReturnValue(makeBuilder({ data: [], count: 0, error: null }));
});

// ─── OPTIONS ─────────────────────────────────────────────────────────────────

describe('OPTIONS', () => {
  it('returns 200', async () => {
    const r = res();
    await handler(req('OPTIONS'), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe('auth guard', () => {
  it('returns 403 when x-admin-key header is absent', async () => {
    const r = res();
    await handler(req('POST', { action: 'stats' }), r);
    expect(r.statusCode).toBe(403);
  });

  it('returns 403 for a wrong admin key', async () => {
    const r = res();
    await handler(req('POST', { action: 'stats' }, { 'x-admin-key': 'wrong-key' }), r);
    expect(r.statusCode).toBe(403);
  });
});

// ─── stats action ─────────────────────────────────────────────────────────────

describe('stats', () => {
  it('returns user counts and MRR', async () => {
    // Three parallel count queries
    mocks.supabase.from
      .mockReturnValueOnce(makeBuilder({ count: 120, data: null, error: null })) // total
      .mockReturnValueOnce(makeBuilder({ count: 45, data: null, error: null }))  // active_7d
      .mockReturnValueOnce(makeBuilder({ count: 30, data: null, error: null })); // paying

    const r = res();
    await handler(req('POST', { action: 'stats' }, ADMIN_HEADERS), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.total_users).toBe(120);
    expect(r.body.active_7d).toBe(45);
    expect(r.body.paying).toBe(30);
    expect(r.body.mrr).toBe(30 * 35); // £35/subscriber
  });

  it('handles 0 counts gracefully (no null crash)', async () => {
    mocks.supabase.from
      .mockReturnValueOnce(makeBuilder({ count: 0, data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ count: 0, data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ count: 0, data: null, error: null }));

    const r = res();
    await handler(req('POST', { action: 'stats' }, ADMIN_HEADERS), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.total_users).toBe(0);
    expect(r.body.mrr).toBe(0);
  });
});

// ─── users action ─────────────────────────────────────────────────────────────

describe('users', () => {
  it('returns user list and pagination metadata', async () => {
    const fakeUsers = [{ id: 'u1', email: 'a@b.com' }, { id: 'u2', email: 'c@d.com' }];
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: fakeUsers, count: 2, error: null }));

    const r = res();
    await handler(req('POST', { action: 'users' }, ADMIN_HEADERS), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.users).toEqual(fakeUsers);
    expect(r.body.total).toBe(2);
    expect(r.body.pages).toBeGreaterThanOrEqual(1);
  });

  it('returns empty array when there are no users', async () => {
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: null, count: 0, error: null }));
    const r = res();
    await handler(req('POST', { action: 'users' }, ADMIN_HEADERS), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.users).toEqual([]);
  });
});

// ─── send_weekly_emails action ────────────────────────────────────────────────

describe('send_weekly_emails', () => {
  it('sends emails to all active subscribers and returns count', async () => {
    const activeUsers = [
      { email: 'a@b.com', name: 'Alice', xp: 100, accuracy: 80, streak: 3, questions_answered: 20 },
      { email: 'c@d.com', name: 'Bob', xp: 200, accuracy: 90, streak: 7, questions_answered: 40 },
    ];
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: activeUsers, error: null }));
    process.env.SITE_URL = 'https://synaptiq.test';
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });

    const r = res();
    await handler(req('POST', { action: 'send_weekly_emails' }, ADMIN_HEADERS), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.sent).toBe(2);
  });

  it('returns 0 sent when there are no active subscribers', async () => {
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: [], error: null }));
    const r = res();
    await handler(req('POST', { action: 'send_weekly_emails' }, ADMIN_HEADERS), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.sent).toBe(0);
  });
});

// ─── Unknown action ───────────────────────────────────────────────────────────

describe('unknown action', () => {
  it('returns 400 for an unrecognised action', async () => {
    const r = res();
    await handler(req('POST', { action: 'fly_to_moon' }, ADMIN_HEADERS), r);
    expect(r.statusCode).toBe(400);
  });
});

// ─── reset_users action ───────────────────────────────────────────────────────

describe('reset_users', () => {
  beforeEach(() => {
    mocks.supabase.auth.admin.listUsers.mockReset();
    mocks.supabase.auth.admin.deleteUser.mockReset();
    mocks.supabase.auth.admin.deleteUser.mockResolvedValue({ error: null });
  });

  it('deletes all users and returns count', async () => {
    mocks.supabase.auth.admin.listUsers.mockResolvedValueOnce({
      data: { users: [{ id: 'u1' }, { id: 'u2' }] },
      error: null,
    });
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: null, error: null }));

    const r = res();
    await handler(req('POST', { action: 'reset_users' }, ADMIN_HEADERS), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(r.body.deleted).toBe(2);
  });

  it('returns 500 when listUsers fails', async () => {
    // Supabase admin listUsers returns error — data must be non-null for destructuring to work
    mocks.supabase.auth.admin.listUsers.mockResolvedValueOnce({
      data: { users: [] },
      error: { message: 'admin error' },
    });

    const r = res();
    await handler(req('POST', { action: 'reset_users' }, ADMIN_HEADERS), r);
    expect(r.statusCode).toBe(500);
    expect(r.body.error).toMatch(/admin error/i);
  });

  it('handles empty user list gracefully', async () => {
    mocks.supabase.auth.admin.listUsers.mockResolvedValueOnce({
      data: { users: [] },
      error: null,
    });

    const r = res();
    await handler(req('POST', { action: 'reset_users' }, ADMIN_HEADERS), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.deleted).toBe(0);
  });
});

// ─── send_weekly_emails — fetch failure counting ─────────────────────────────

describe('send_weekly_emails — partial failures', () => {
  it('counts failed emails when fetch throws', async () => {
    const activeUsers = [
      { email: 'a@b.com', name: 'Alice', xp: 100, accuracy: 80, streak: 3, questions_answered: 20 },
      { email: 'c@d.com', name: 'Bob', xp: 200, accuracy: 90, streak: 7, questions_answered: 40 },
    ];
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: activeUsers, error: null }));
    process.env.SITE_URL = 'https://synaptiq.test';
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
      .mockRejectedValueOnce(new Error('network failure'));

    const r = res();
    await handler(req('POST', { action: 'send_weekly_emails' }, ADMIN_HEADERS), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.sent).toBe(1);
    expect(r.body.failed).toBe(1);

    delete global.fetch;
  });
});
