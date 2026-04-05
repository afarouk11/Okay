/**
 * Tests for api/plan.js — AI daily study plan generator.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mock setup ───────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

  const supabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  };
  return { supabase };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mocks.supabase,
}));

import handler from '../../api/plan.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBuilder(resolution = { data: null, error: null }) {
  const b = {
    _r: resolution,
    then(res, rej) { return Promise.resolve(b._r).then(res, rej); },
  };
  ['select', 'eq', 'single', 'update', 'lt', 'lte', 'gt', 'limit', 'order', 'insert'].forEach(m => {
    b[m] = vi.fn().mockReturnValue(b);
  });
  return b;
}

function req(body = {}, method = 'POST', headers = {}) {
  return { method, body, headers, socket: { remoteAddress: '127.0.0.1' } };
}

function res() {
  const r = { statusCode: 200, body: null };
  r.setHeader = () => r;
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (d) => { r.body = d; return r; };
  r.end = () => r;
  return r;
}

const VALID_PLAN_RESPONSE = {
  content: [{ type: 'text', text: JSON.stringify({
    sessions: [
      { topic: 'Integration by parts', duration_min: 25, type: 'Study', why: 'Weak area' },
      { topic: 'Trigonometry', duration_min: 25, type: 'Revision', why: 'Due for review' },
      { topic: 'Break', duration_min: 10, type: 'Break', why: 'Rest and consolidate' }
    ]
  }) }]
};

function setupAuthenticatedUser(userId = 'user-1') {
  mocks.supabase.auth.getUser.mockResolvedValueOnce({
    data: { user: { id: userId } },
    error: null,
  });
}

function setupProfileAndTopics(profileData = {}) {
  // profile fetch
  mocks.supabase.from
    .mockReturnValueOnce(makeBuilder({ data: profileData, error: null }))
    // weak topics
    .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
    // review queue
    .mockReturnValueOnce(makeBuilder({ data: [], error: null }));
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
  mocks.supabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'No user' },
  });
  mocks.supabase.from.mockReturnValue(makeBuilder());
});

afterEach(() => {
  delete global.fetch;
});

// ─── OPTIONS preflight ────────────────────────────────────────────────────────

describe('OPTIONS preflight', () => {
  it('returns 200', async () => {
    const r = res();
    await handler(req({}, 'OPTIONS'), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── Non-POST method ─────────────────────────────────────────────────────────

describe('non-POST method', () => {
  it('returns 405 for GET', async () => {
    const r = res();
    await handler(req({}, 'GET'), r);
    expect(r.statusCode).toBe(405);
    expect(r.body.error).toMatch(/method not allowed/i);
  });
});

// ─── Missing ANTHROPIC_API_KEY ────────────────────────────────────────────────

describe('missing ANTHROPIC_API_KEY', () => {
  it('returns 500 when the env var is absent', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    // No auth setup needed: the API key check fires before authentication
    const r = res();
    await handler(req({}, 'POST', { authorization: 'Bearer valid-token' }), r);
    expect(r.statusCode).toBe(500);
    expect(r.body.error).toMatch(/ANTHROPIC_API_KEY/i);
  });
});

// ─── Request body validation ──────────────────────────────────────────────────

describe('input validation', () => {
  it('returns 400 when focus exceeds 120 characters', async () => {
    const r = res();
    await handler(
      req({ focus: 'x'.repeat(121) }, 'POST', { authorization: 'Bearer token' }),
      r
    );
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/focus/i);
  });

  it('returns 400 when focus is not a string', async () => {
    const r = res();
    await handler(
      req({ focus: 42 }, 'POST', { authorization: 'Bearer token' }),
      r
    );
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/focus/i);
  });
});

// ─── Authentication ───────────────────────────────────────────────────────────

describe('authentication', () => {
  it('returns 401 when no Bearer token is provided', async () => {
    const r = res();
    await handler(req({}), r);
    expect(r.statusCode).toBe(401);
  });

  it('returns 401 when the token is invalid', async () => {
    mocks.supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'invalid' },
    });
    const r = res();
    await handler(req({}, 'POST', { authorization: 'Bearer bad-token' }), r);
    expect(r.statusCode).toBe(401);
  });
});

// ─── Successful plan generation ───────────────────────────────────────────────

describe('successful plan generation', () => {
  it('returns a plan with the default time_available of 60 minutes', async () => {
    setupAuthenticatedUser();
    setupProfileAndTopics({ name: 'Alice', year_group: '13', exam_board: 'AQA', target_grade: 'A*' });

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(VALID_PLAN_RESPONSE),
    });

    const r = res();
    await handler(req({}, 'POST', { authorization: 'Bearer valid-token' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.plan).toBeDefined();
    expect(r.body.plan.time_available).toBe(60);
    expect(Array.isArray(r.body.plan.sessions)).toBe(true);
    expect(r.body.plan.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('clamps time_available to a minimum of 15 minutes', async () => {
    setupAuthenticatedUser();
    setupProfileAndTopics({});

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(VALID_PLAN_RESPONSE),
    });

    const r = res();
    await handler(req({ time_available: 5 }, 'POST', { authorization: 'Bearer valid-token' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.plan.time_available).toBe(15);
  });

  it('clamps time_available to a maximum of 480 minutes', async () => {
    setupAuthenticatedUser();
    setupProfileAndTopics({});

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(VALID_PLAN_RESPONSE),
    });

    const r = res();
    await handler(req({ time_available: 1000 }, 'POST', { authorization: 'Bearer valid-token' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.plan.time_available).toBe(480);
  });

  it('accepts an optional focus topic', async () => {
    setupAuthenticatedUser();
    setupProfileAndTopics({});

    let capturedBody;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(VALID_PLAN_RESPONSE),
      });
    });

    const r = res();
    await handler(
      req({ focus: 'Quadratic equations' }, 'POST', { authorization: 'Bearer valid-token' }),
      r
    );
    expect(r.statusCode).toBe(200);
    // The focus should appear in the Claude prompt
    const userContent = capturedBody.messages[0].content;
    expect(userContent).toMatch(/Quadratic equations/);
  });

  it('gracefully handles malformed JSON from Claude', async () => {
    setupAuthenticatedUser();
    setupProfileAndTopics({});

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Here is your plan: { sessions: [] }' }]
      }),
    });

    const r = res();
    await handler(req({}, 'POST', { authorization: 'Bearer valid-token' }), r);
    expect(r.statusCode).toBe(200);
    expect(Array.isArray(r.body.plan.sessions)).toBe(true);
  });

  it('returns empty sessions when Claude returns unparseable output', async () => {
    setupAuthenticatedUser();
    setupProfileAndTopics({});

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'completely unparseable text with no JSON' }]
      }),
    });

    const r = res();
    await handler(req({}, 'POST', { authorization: 'Bearer valid-token' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.plan.sessions).toEqual([]);
  });
});

// ─── Claude API error ─────────────────────────────────────────────────────────

describe('Claude API errors', () => {
  it('returns 500 when fetch throws a network error', async () => {
    setupAuthenticatedUser();
    setupProfileAndTopics({});

    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const r = res();
    await handler(req({}, 'POST', { authorization: 'Bearer valid-token' }), r);
    expect(r.statusCode).toBe(500);
    expect(r.body.error).toMatch(/failed to connect/i);
  });

  it('returns 502 when Claude returns a non-OK status', async () => {
    setupAuthenticatedUser();
    setupProfileAndTopics({});

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 529,
      json: () => Promise.resolve({ error: { type: 'overloaded_error' } }),
    });

    const r = res();
    await handler(req({}, 'POST', { authorization: 'Bearer valid-token' }), r);
    expect(r.statusCode).toBe(502);
    expect(r.body.error).toMatch(/AI service/i);
  });
});

// ─── save_tasks ───────────────────────────────────────────────────────────────

describe('save_tasks', () => {
  it('inserts non-break sessions as tasks when save_tasks is true', async () => {
    setupAuthenticatedUser('user-save');
    setupProfileAndTopics({});

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(VALID_PLAN_RESPONSE),
    });

    const insertBuilder = makeBuilder({ data: null, error: null });
    mocks.supabase.from.mockReturnValueOnce(insertBuilder);

    const r = res();
    await handler(
      req({ save_tasks: true }, 'POST', { authorization: 'Bearer valid-token' }),
      r
    );
    expect(r.statusCode).toBe(200);
    // insert should have been called on the tasks table
    expect(mocks.supabase.from).toHaveBeenCalledWith('tasks');
  });
});
