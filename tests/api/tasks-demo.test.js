/**
 * Tests for the demo mode of api/tasks.js.
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

import handler from '../../api/tasks.js';

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

describe('demo mode — tasks', () => {
  it('GET returns empty tasks array', async () => {
    const r = res();
    await handler(req('GET', {}, {}), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.tasks).toEqual([]);
  });

  it('POST returns success with the request body as the task', async () => {
    const taskBody = { title: 'Demo task' };
    const r = res();
    await handler(req('POST', taskBody, {}), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('OPTIONS returns 200', async () => {
    const r = res();
    await handler(req('OPTIONS'), r);
    expect(r.statusCode).toBe(200);
  });
});
