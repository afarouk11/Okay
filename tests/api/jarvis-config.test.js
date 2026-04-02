/**
 * Tests for api/jarvis-config.js — runtime JARVIS agent config endpoint.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import handler from '../../api/jarvis-config.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function req(method = 'GET') {
  return { method, headers: { 'x-forwarded-for': '1.2.3.4' } };
}

function res() {
  const r = { statusCode: 200, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; return r; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (d) => { r.body = d; return r; };
  r.end = () => r;
  return r;
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ELEVEN_AGENT_ID;
  delete process.env.ELEVENLABS_API_KEY;
});

afterEach(() => {
  delete process.env.ELEVEN_AGENT_ID;
  delete process.env.ELEVENLABS_API_KEY;
});

// ─── OPTIONS ──────────────────────────────────────────────────────────────────

describe('OPTIONS', () => {
  it('returns 200', async () => {
    const r = res();
    await handler(req('OPTIONS'), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── Non-GET ──────────────────────────────────────────────────────────────────

describe('non-GET', () => {
  it('returns 405 for POST', async () => {
    const r = res();
    await handler(req('POST'), r);
    expect(r.statusCode).toBe(405);
  });
});

// ─── Missing ELEVEN_AGENT_ID — falls back to built-in agent ──────────────────

describe('missing ELEVEN_AGENT_ID', () => {
  it('falls back to the built-in agent ID when env var is absent', async () => {
    const r = res();
    await handler(req(), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.agentId).toBe('agent_4101kn5cm6t2efwsasfhx8cgh1r3');
  });
});

// ─── No API key — returns agentId directly ────────────────────────────────────

describe('ELEVEN_AGENT_ID set, no ELEVENLABS_API_KEY', () => {
  beforeEach(() => {
    process.env.ELEVEN_AGENT_ID = 'test-agent-123';
  });

  it('returns agentId directly when ELEVENLABS_API_KEY is absent', async () => {
    const r = res();
    await handler(req(), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.agentId).toBe('test-agent-123');
    expect(r.body.signedUrl).toBeUndefined();
  });
});

// ─── Signed URL from ElevenLabs ───────────────────────────────────────────────

describe('ELEVEN_AGENT_ID + ELEVENLABS_API_KEY set', () => {
  beforeEach(() => {
    process.env.ELEVEN_AGENT_ID = 'test-agent-123';
    process.env.ELEVENLABS_API_KEY = 'el-key';
  });

  it('returns conversationToken from ElevenLabs', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'eyJhbGciOiJIUzI1NiJ9.abc' }),
    });

    const r = res();
    await handler(req(), r);

    expect(r.statusCode).toBe(200);
    expect(r.body.conversationToken).toBe('eyJhbGciOiJIUzI1NiJ9.abc');
    expect(r.body.agentId).toBeUndefined();
  });

  it('calls ElevenLabs token endpoint with the correct agent_id query param', async () => {
    let capturedUrl;
    global.fetch = vi.fn().mockImplementationOnce((url) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: 'test-token' }),
      });
    });

    await handler(req(), res());
    expect(capturedUrl).toContain('/token?agent_id=test-agent-123');
  });

  it('falls back to agentId when ElevenLabs returns an error', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });

    const r = res();
    await handler(req(), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.agentId).toBe('test-agent-123');
  });

  it('falls back to agentId when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    const r = res();
    await handler(req(), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.agentId).toBe('test-agent-123');
  });
});
