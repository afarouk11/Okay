/**
 * Tests for api/memory.js — Jarvis episodic memory endpoint.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Hoisted mock setup ───────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  process.env.SUPABASE_URL        = 'https://test.supabase.co';
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

import handler from '../../api/memory.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Chainable Supabase query builder stub.
 * Call makeBuilder({ data: [...], error: null }) to set the resolved value.
 */
function makeBuilder(resolution = { data: null, error: null }) {
  const b = {
    _r: resolution,
    then(res, rej) { return Promise.resolve(b._r).then(res, rej); },
  };
  ['select', 'insert', 'eq', 'order', 'limit'].forEach(m => {
    b[m] = vi.fn().mockReturnValue(b);
  });
  return b;
}

function req(method, { body = {}, headers = {}, query = {} } = {}) {
  return { method, body, headers, query };
}

function res() {
  const r = { statusCode: 200, body: null };
  r.setHeader = () => r;
  r.status = (c) => { r.statusCode = c; return r; };
  r.json  = (d) => { r.body = d; return r; };
  r.end   = () => r;
  return r;
}

const VALID_USER = { id: 'user-abc', email: 'student@test.com' };

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

// ─── Unsupported methods ──────────────────────────────────────────────────────

describe('unsupported methods', () => {
  it('returns 405 for DELETE', async () => {
    const r = res();
    await handler(req('DELETE'), r);
    expect(r.statusCode).toBe(405);
  });

  it('returns 405 for PUT', async () => {
    const r = res();
    await handler(req('PUT'), r);
    expect(r.statusCode).toBe(405);
  });
});

// ─── No auth token ────────────────────────────────────────────────────────────

describe('unauthenticated', () => {
  it('GET returns 401 when Authorization header is missing', async () => {
    const r = res();
    await handler(req('GET'), r);
    expect(r.statusCode).toBe(401);
  });

  it('POST returns 401 when Authorization header is missing', async () => {
    const r = res();
    await handler(req('POST'), r);
    expect(r.statusCode).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    mocks.supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('invalid'),
    });
    const r = res();
    await handler(req('GET', { headers: { authorization: 'Bearer bad' } }), r);
    expect(r.statusCode).toBe(401);
  });
});

// ─── GET — retrieve sessions ──────────────────────────────────────────────────

describe('GET /api/memory', () => {
  it('returns sessions array on success', async () => {
    const fakeSessions = [
      { id: '1', session_date: '2024-01-01T00:00:00Z', topic: 'Calculus', mastery_score: 0.85, specific_errors: ['Chain Rule sign flip'], duration_ms: 1800000 },
    ];
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: fakeSessions, error: null }));

    const r = res();
    await handler(req('GET', { headers: { authorization: 'Bearer valid' } }), r);

    expect(r.statusCode).toBe(200);
    expect(r.body.sessions).toEqual(fakeSessions);
  });

  it('returns empty array when no sessions exist', async () => {
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: [], error: null }));

    const r = res();
    await handler(req('GET', { headers: { authorization: 'Bearer valid' } }), r);

    expect(r.statusCode).toBe(200);
    expect(r.body.sessions).toEqual([]);
  });

  it('returns empty array when Supabase returns null data', async () => {
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: null, error: null }));

    const r = res();
    await handler(req('GET', { headers: { authorization: 'Bearer valid' } }), r);

    expect(r.statusCode).toBe(200);
    expect(r.body.sessions).toEqual([]);
  });

  it('returns 500 when Supabase query fails', async () => {
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: null, error: { message: 'DB error' } }));

    const r = res();
    await handler(req('GET', { headers: { authorization: 'Bearer valid' } }), r);

    expect(r.statusCode).toBe(500);
    expect(r.body.error).toBeTruthy();
  });

  it('clamps limit to MAX_LIMIT (20) when an oversized value is provided', async () => {
    const builder = makeBuilder({ data: [], error: null });
    mocks.supabase.from.mockReturnValue(builder);

    await handler(req('GET', { headers: { authorization: 'Bearer valid' }, query: { limit: '999' } }), res());

    expect(builder.limit).toHaveBeenCalledWith(20);
  });

  it('uses limit=5 when no query param is provided', async () => {
    const builder = makeBuilder({ data: [], error: null });
    mocks.supabase.from.mockReturnValue(builder);

    await handler(req('GET', { headers: { authorization: 'Bearer valid' } }), res());

    expect(builder.limit).toHaveBeenCalledWith(5);
  });

  it('uses limit=1 as minimum when limit=0 is provided', async () => {
    const builder = makeBuilder({ data: [], error: null });
    mocks.supabase.from.mockReturnValue(builder);

    await handler(req('GET', { headers: { authorization: 'Bearer valid' }, query: { limit: '0' } }), res());

    expect(builder.limit).toHaveBeenCalledWith(1);
  });

  it('falls back to limit=5 for a non-numeric limit param', async () => {
    const builder = makeBuilder({ data: [], error: null });
    mocks.supabase.from.mockReturnValue(builder);

    await handler(req('GET', { headers: { authorization: 'Bearer valid' }, query: { limit: 'abc' } }), res());

    expect(builder.limit).toHaveBeenCalledWith(5);
  });
});

// ─── POST — save a session ────────────────────────────────────────────────────

describe('POST /api/memory', () => {
  it('returns 201 for a valid full session payload', async () => {
    const r = res();
    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: {
        topic:          'Mechanics',
        mastery_score:  0.72,
        specific_errors: ['Sign error in friction'],
        duration_ms:    3600000,
      },
    }), r);

    expect(r.statusCode).toBe(201);
    expect(r.body.success).toBe(true);
  });

  it('returns 201 for an empty payload (all fields optional)', async () => {
    const r = res();
    await handler(req('POST', { headers: { authorization: 'Bearer valid' }, body: {} }), r);
    expect(r.statusCode).toBe(201);
  });

  it('returns 201 for null optional fields', async () => {
    const r = res();
    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: { topic: null, mastery_score: null, specific_errors: null, duration_ms: null },
    }), r);
    expect(r.statusCode).toBe(201);
  });

  it('returns 400 when topic is not a string', async () => {
    const r = res();
    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: { topic: 42 },
    }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 when topic exceeds 100 characters', async () => {
    const r = res();
    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: { topic: 'A'.repeat(101) },
    }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 when mastery_score is out of range', async () => {
    const r = res();
    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: { mastery_score: 1.5 },
    }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 when mastery_score is negative', async () => {
    const r = res();
    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: { mastery_score: -0.1 },
    }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 when specific_errors is not an array', async () => {
    const r = res();
    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: { specific_errors: 'bad' },
    }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 when specific_errors has a non-string entry', async () => {
    const r = res();
    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: { specific_errors: ['valid', 123] },
    }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 when specific_errors exceeds 20 entries', async () => {
    const r = res();
    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: { specific_errors: Array(21).fill('error') },
    }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 when an error string exceeds 200 characters', async () => {
    const r = res();
    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: { specific_errors: ['x'.repeat(201)] },
    }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 when duration_ms is negative', async () => {
    const r = res();
    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: { duration_ms: -1 },
    }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 when duration_ms is not an integer', async () => {
    const r = res();
    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: { duration_ms: 1.5 },
    }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 when duration_ms is not a number', async () => {
    const r = res();
    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: { duration_ms: 'long' },
    }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 500 when Supabase insert fails', async () => {
    mocks.supabase.from.mockReturnValue(makeBuilder({ data: null, error: { message: 'insert failed' } }));

    const r = res();
    await handler(req('POST', { headers: { authorization: 'Bearer valid' }, body: {} }), r);
    expect(r.statusCode).toBe(500);
    expect(r.body.error).toBeTruthy();
  });

  it('inserts with user_id from the authenticated user', async () => {
    const builder = makeBuilder({ data: null, error: null });
    mocks.supabase.from.mockReturnValue(builder);

    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: { topic: 'Statistics' },
    }), res());

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: VALID_USER.id })
    );
  });

  it('trims whitespace from topic before inserting', async () => {
    const builder = makeBuilder({ data: null, error: null });
    mocks.supabase.from.mockReturnValue(builder);

    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: { topic: '  Calculus  ' },
    }), res());

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'Calculus' })
    );
  });

  it('stores null for empty string topic', async () => {
    const builder = makeBuilder({ data: null, error: null });
    mocks.supabase.from.mockReturnValue(builder);

    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: { topic: '   ' },
    }), res());

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ topic: null })
    );
  });

  it('defaults specific_errors to [] when absent', async () => {
    const builder = makeBuilder({ data: null, error: null });
    mocks.supabase.from.mockReturnValue(builder);

    await handler(req('POST', {
      headers: { authorization: 'Bearer valid' },
      body: {},
    }), res());

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ specific_errors: [] })
    );
  });
});
