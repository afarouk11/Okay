/**
 * Tests for the demo mode of api/progress.js.
 *
 * When supabase is null the handler returns empty client-side data
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

import handler from '../../api/progress.js';

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

describe('demo mode — progress', () => {
  it('GET returns empty progress, mistakes, activity and null profile', async () => {
    const r = res();
    await handler(req('GET', {}, {}), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.progress).toEqual([]);
    expect(r.body.mistakes).toEqual([]);
    expect(r.body.activity).toEqual([]);
    expect(r.body.profile).toBeNull();
  });

  it('POST returns success', async () => {
    const r = res();
    await handler(req('POST', { subject: 'Maths', topic: 'Algebra', correct: 4, total: 5, xpEarned: 10 }, {}), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('OPTIONS returns 200', async () => {
    const r = res();
    await handler(req('OPTIONS'), r);
    expect(r.statusCode).toBe(200);
  });
});
