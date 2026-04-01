/**
 * Tests for the demo mode of api/export.js.
 *
 * When supabase is null the handler returns a demo-mode placeholder response.
 */

import { vi, describe, it, expect } from 'vitest';

vi.hoisted(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => null,
}));

import handler from '../../api/export.js';

function req(method = 'GET', headers = {}) {
  return { method, headers, socket: { remoteAddress: '1.2.3.4' } };
}

function res() {
  const r = { statusCode: 200, body: null };
  r.setHeader = () => r;
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (d) => { r.body = d; return r; };
  r.end = () => r;
  return r;
}

describe('demo mode — export', () => {
  it('returns demo mode response with empty data and a note field', async () => {
    const r = res();
    await handler(req('GET', {}), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.note).toMatch(/demo mode/i);
    expect(r.body.data).toEqual({});
    expect(typeof r.body.exported_at).toBe('string');
  });

  it('OPTIONS returns 200', async () => {
    const r = res();
    await handler(req('OPTIONS'), r);
    expect(r.statusCode).toBe(200);
  });
});
