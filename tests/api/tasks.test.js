/**
 * Tests for api/tasks.js — task CRUD operations with GitHub issue creation.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Hoisted mock setup ───────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  process.env.GITHUB_TOKEN = 'gh-test-token';
  process.env.GITHUB_OWNER = 'test-owner';
  process.env.GITHUB_REPO  = 'test-repo';

  const supabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  };
  return { supabase };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mocks.supabase,
}));

import handler from '../../api/tasks.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBuilder(resolution = { data: null, error: null }) {
  const b = {
    _r: resolution,
    then(res, rej) { return Promise.resolve(b._r).then(res, rej); },
  };
  ['select', 'insert', 'update', 'delete', 'eq', 'single', 'order'].forEach(m => {
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

const VALID_USER    = { id: 'user-1', email: 'user@test.com' };
const VALID_TASK_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

/** Returns a fetch mock that responds with the given status and body. */
function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.supabase.auth.getUser.mockResolvedValue({ data: { user: VALID_USER }, error: null });
  mocks.supabase.from.mockReturnValue(makeBuilder());
  // Default: GitHub API succeeds and returns issue #42
  global.fetch = mockFetch(201, { number: 42 });
});

// ─── OPTIONS ──────────────────────────────────────────────────────────────────

describe('OPTIONS', () => {
  it('returns 200', async () => {
    const r = res();
    await handler(req('OPTIONS'), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── Unauthenticated requests ─────────────────────────────────────────────────

describe('unauthenticated', () => {
  it('returns 401 when no Authorization header is present', async () => {
    const r = res();
    await handler(req('GET', {}, {}), r);
    expect(r.statusCode).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    mocks.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid token' } });
    const r = res();
    await handler(req('GET', {}, { authorization: 'Bearer bad-tok' }), r);
    expect(r.statusCode).toBe(401);
  });
});

// ─── GET ──────────────────────────────────────────────────────────────────────

describe('GET', () => {
  it('returns tasks array for authenticated user', async () => {
    const dbTask = { id: VALID_TASK_ID, title: 'Review integration by parts', done: false, github_issue_number: 1 };
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: [dbTask], error: null }));
    const r = res();
    await handler(req('GET', {}, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.tasks).toEqual([dbTask]);
  });

  it('returns empty array when user has no tasks', async () => {
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    const r = res();
    await handler(req('GET', {}, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.tasks).toEqual([]);
  });
});

// ─── POST ─────────────────────────────────────────────────────────────────────

describe('POST', () => {
  it('returns 400 when title is missing', async () => {
    const r = res();
    await handler(req('POST', { description: 'some detail' }, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/title/i);
  });

  it('creates a task, saves a GitHub issue, and returns the task', async () => {
    const dbTask = { id: VALID_TASK_ID, title: 'Practice trigonometry', done: false, github_issue_number: 42 };
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: dbTask, error: null }));
    const r = res();
    await handler(req('POST', { title: 'Practice trigonometry', description: 'Focus on unit circle' }, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.task).toEqual(dbTask);
    // GitHub API was called
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/test-owner/test-repo/issues',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('still creates the task when GitHub API returns an error', async () => {
    global.fetch = mockFetch(422, { message: 'Unprocessable Entity' });
    const dbTask = { id: VALID_TASK_ID, title: 'Practice trigonometry', done: false, github_issue_number: null };
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: dbTask, error: null }));
    const r = res();
    await handler(req('POST', { title: 'Practice trigonometry' }, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.task).toEqual(dbTask);
  });

  it('still creates the task when fetch throws a network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const dbTask = { id: VALID_TASK_ID, title: 'Practice trigonometry', done: false, github_issue_number: null };
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: dbTask, error: null }));
    const r = res();
    await handler(req('POST', { title: 'Practice trigonometry' }, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.task).toEqual(dbTask);
  });

  it('skips GitHub issue creation when credentials are not configured', async () => {
    const saved = {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      GITHUB_OWNER: process.env.GITHUB_OWNER,
      GITHUB_REPO:  process.env.GITHUB_REPO,
    };
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_OWNER;
    delete process.env.GITHUB_REPO;

    const dbTask = { id: VALID_TASK_ID, title: 'No-issue task', done: false, github_issue_number: null };
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: dbTask, error: null }));
    const r = res();
    await handler(req('POST', { title: 'No-issue task' }, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(200);
    expect(global.fetch).not.toHaveBeenCalled();

    Object.assign(process.env, saved);
  });

  it('returns 500 when the database insert fails', async () => {
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'insert failed' } }));
    const r = res();
    await handler(req('POST', { title: 'Failing task' }, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(500);
    expect(r.body.error).toMatch(/insert failed/i);
  });
});

// ─── PUT ──────────────────────────────────────────────────────────────────────

describe('PUT', () => {
  it('returns 400 when id is missing', async () => {
    const r = res();
    await handler(req('PUT', { title: 'Updated title' }, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 for a non-UUID id', async () => {
    const r = res();
    await handler(req('PUT', { id: 'not-a-uuid', title: 'Updated' }, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(400);
  });

  it('updates a task and returns it', async () => {
    const dbTask = { id: VALID_TASK_ID, title: 'Updated title', done: true, github_issue_number: 42 };
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: dbTask, error: null }));
    const r = res();
    await handler(req('PUT', { id: VALID_TASK_ID, title: 'Updated title', done: true }, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.task).toEqual(dbTask);
  });

  it('returns 404 when the task does not exist', async () => {
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    const r = res();
    await handler(req('PUT', { id: VALID_TASK_ID, done: true }, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(404);
    expect(r.body.error).toMatch(/not found/i);
  });

  it('returns 400 when the DB update returns an error', async () => {
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'update failed' } }));
    const r = res();
    await handler(req('PUT', { id: VALID_TASK_ID, title: 'New title' }, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/update failed/i);
  });
});

// ─── DELETE ───────────────────────────────────────────────────────────────────

describe('DELETE', () => {
  it('returns 400 when id is missing', async () => {
    const r = res();
    await handler(req('DELETE', {}, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 for a non-UUID id', async () => {
    const r = res();
    await handler(req('DELETE', { id: 'not-a-uuid' }, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 200 for a valid delete request', async () => {
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    const r = res();
    await handler(req('DELETE', { id: VALID_TASK_ID }, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.success).toBe(true);
  });
});

// ─── Unsupported method ───────────────────────────────────────────────────────

describe('unsupported method', () => {
  it('returns 405 for PATCH', async () => {
    const r = res();
    await handler(req('PATCH', {}, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(405);
  });
});
