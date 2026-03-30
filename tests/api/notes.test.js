/**
 * Tests for api/notes.js — note CRUD operations.
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

const VALID_USER = { id: 'user-1', email: 'user@test.com' };
const VALID_NOTE_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

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

// ─── GET ─────────────────────────────────────────────────────────────────────

describe('GET', () => {
  it('returns notes array for authenticated user', async () => {
    // Mock returns DB schema shape (content/tags[]), API maps to legacy {text,tag}
    const dbNote = { id: VALID_NOTE_ID, content: 'Integration by parts', subject: 'Maths', tags: [] };
    const expectedNote = { ...dbNote, text: 'Integration by parts', tag: undefined };
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: [dbNote], error: null }));
    const r = res();
    await handler(req('GET', {}, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.notes).toEqual([expectedNote]);
  });

  it('returns empty array when user has no notes', async () => {
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    const r = res();
    await handler(req('GET', {}, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.notes).toEqual([]);
  });
});

// ─── POST ─────────────────────────────────────────────────────────────────────

describe('POST', () => {
  it('returns 400 when text is missing', async () => {
    const r = res();
    await handler(req('POST', { subject: 'Maths' }, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/text/i);
  });

  it('returns 400 when subject is missing', async () => {
    const r = res();
    await handler(req('POST', { text: 'Some note' }, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/subject/i);
  });

  it('creates a note and returns it', async () => {
    // Mock returns DB schema shape; API maps content→text, tags[0]→tag
    const dbNote = { id: VALID_NOTE_ID, content: 'Pythagoras', subject: 'Maths', tags: [] };
    const expectedNote = { ...dbNote, text: 'Pythagoras', tag: undefined };
    mocks.supabase.from.mockReturnValueOnce(makeBuilder({ data: dbNote, error: null }));
    const r = res();
    await handler(req('POST', { text: 'Pythagoras', subject: 'Maths' }, { authorization: 'Bearer valid-tok' }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.note).toEqual(expectedNote);
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
    await handler(req('DELETE', { id: VALID_NOTE_ID }, { authorization: 'Bearer valid-tok' }), r);
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
