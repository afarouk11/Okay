/**
 * Tests for the demo mode of api/plan.js.
 *
 * When Supabase is not configured the handler short-circuits to a static
 * example plan without any authentication or Claude calls.
 */

import { vi, describe, it, expect } from 'vitest';

vi.hoisted(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => null,
}));

import handler from '../../api/plan.js';

function req(method = 'POST', body = {}, headers = {}) {
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

describe('demo mode — plan', () => {
  it('returns a plan without requiring auth', async () => {
    const r = res();
    await handler(req(), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.plan).toBeDefined();
    expect(Array.isArray(r.body.plan.sessions)).toBe(true);
    expect(r.body.plan.sessions.length).toBeGreaterThan(0);
  });

  it('plan includes date and time_available fields', async () => {
    const r = res();
    await handler(req('POST', { time_available: 90 }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.plan.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.body.plan.time_available).toBe(90);
  });

  it('uses the default time_available of 60 when not specified', async () => {
    const r = res();
    await handler(req(), r);
    expect(r.body.plan.time_available).toBe(60);
  });

  it('returns 405 for GET requests', async () => {
    const r = res();
    await handler(req('GET'), r);
    expect(r.statusCode).toBe(405);
  });

  it('returns 200 for OPTIONS preflight', async () => {
    const r = res();
    await handler(req('OPTIONS'), r);
    expect(r.statusCode).toBe(200);
  });
});
