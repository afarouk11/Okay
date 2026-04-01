/**
 * Tests for the demo mode of api/notes.js.
 *
 * When supabase is null the handler short-circuits to a simple demo response
 * without any authentication.
 */

import { vi, describe, it, expect } from 'vitest';

vi.hoisted(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => null,
}));

import handler from '../../api/notes.js';

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

describe('demo mode — notes', () => {
  it('GET returns empty notes array', async () => {
    const r = res();
    await handler(req('GET', {}, {}), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.notes).toEqual([]);
  });

  it('POST returns success with the request body as the note', async () => {
    const noteBody = { text: 'Demo note', subject: 'Maths' };
    const r = res();
    await handler(req('POST', noteBody, {}), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('OPTIONS returns 200', async () => {
    const r = res();
    await handler(req('OPTIONS'), r);
    expect(r.statusCode).toBe(200);
  });
});
