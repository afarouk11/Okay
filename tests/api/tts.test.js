/**
 * Tests for api/tts.js — ElevenLabs text-to-speech endpoint.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import handler from '../../api/tts.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function req(body = {}, method = 'POST') {
  return { method, body, headers: { 'x-forwarded-for': '1.2.3.4' } };
}

function res() {
  const r = { statusCode: 200, body: null, headers: {}, written: [] };
  r.setHeader = (k, v) => { r.headers[k] = v; return r; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (d) => { r.body = d; return r; };
  r.write = (chunk) => { r.written.push(chunk); return r; };
  r.end = () => r;
  return r;
}

function mockStream(chunks = [new Uint8Array([1, 2, 3])]) {
  const iter = chunks[Symbol.iterator]();
  return {
    getReader() {
      return {
        async read() {
          const { value, done } = iter.next();
          return done ? { done: true, value: undefined } : { done: false, value };
        },
      };
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ELEVENLABS_API_KEY;
});

afterEach(() => {
  delete process.env.ELEVENLABS_API_KEY;
});

// ─── OPTIONS ──────────────────────────────────────────────────────────────────

describe('OPTIONS', () => {
  it('returns 200', async () => {
    const r = res();
    await handler(req({}, 'OPTIONS'), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── Non-POST ─────────────────────────────────────────────────────────────────

describe('non-POST', () => {
  it('returns 405 for GET', async () => {
    process.env.ELEVENLABS_API_KEY = 'el-key';
    const r = res();
    await handler(req({}, 'GET'), r);
    expect(r.statusCode).toBe(405);
  });
});

// ─── Missing API key ──────────────────────────────────────────────────────────

describe('missing ELEVENLABS_API_KEY', () => {
  it('returns 503', async () => {
    const r = res();
    await handler(req({ text: 'hello' }), r);
    expect(r.statusCode).toBe(503);
    expect(r.body.error).toMatch(/tts/i);
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('validation', () => {
  beforeEach(() => { process.env.ELEVENLABS_API_KEY = 'el-key'; });

  it('returns 400 when text is missing', async () => {
    const r = res();
    await handler(req({}), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/text/i);
  });

  it('returns 400 when text is not a string', async () => {
    const r = res();
    await handler(req({ text: 42 }), r);
    expect(r.statusCode).toBe(400);
  });
});

// ─── Successful stream ────────────────────────────────────────────────────────

describe('successful TTS stream', () => {
  beforeEach(() => { process.env.ELEVENLABS_API_KEY = 'el-key'; });

  it('streams audio and sets Content-Type to audio/mpeg', async () => {
    const chunk = new Uint8Array([0xff, 0xfb, 0x90]);
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      body: mockStream([chunk]),
    });
    const r = res();
    await handler(req({ text: 'Hello world' }), r);
    expect(r.headers['Content-Type']).toBe('audio/mpeg');
    expect(r.written.length).toBeGreaterThan(0);
  });

  it('uses the alice voice by default', async () => {
    let capturedUrl;
    global.fetch = vi.fn().mockImplementationOnce((url) => {
      capturedUrl = url;
      return Promise.resolve({ ok: true, body: mockStream() });
    });
    await handler(req({ text: 'Hi' }), res());
    expect(capturedUrl).toContain('Xb7hH8MSUJpSbSDYk0k2');
  });

  it('uses the charlotte voice when requested', async () => {
    let capturedUrl;
    global.fetch = vi.fn().mockImplementationOnce((url) => {
      capturedUrl = url;
      return Promise.resolve({ ok: true, body: mockStream() });
    });
    await handler(req({ text: 'Hi', voice: 'charlotte' }), res());
    expect(capturedUrl).toContain('XB0fDUnXU5powFXDhCwa');
  });

  it('uses the sarah voice when requested', async () => {
    let capturedUrl;
    global.fetch = vi.fn().mockImplementationOnce((url) => {
      capturedUrl = url;
      return Promise.resolve({ ok: true, body: mockStream() });
    });
    await handler(req({ text: 'Hi', voice: 'sarah' }), res());
    expect(capturedUrl).toContain('Xa6FiFljSPqBPi9LqiXS');
  });

  it('falls back to alice for an unknown voice name', async () => {
    let capturedUrl;
    global.fetch = vi.fn().mockImplementationOnce((url) => {
      capturedUrl = url;
      return Promise.resolve({ ok: true, body: mockStream() });
    });
    await handler(req({ text: 'Hi', voice: 'unknown_voice' }), res());
    expect(capturedUrl).toContain('Xb7hH8MSUJpSbSDYk0k2');
  });
});

// ─── ElevenLabs API error ─────────────────────────────────────────────────────

describe('ElevenLabs API error', () => {
  beforeEach(() => { process.env.ELEVENLABS_API_KEY = 'el-key'; });

  it('returns the upstream status code on failure', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: () => Promise.resolve('invalid voice'),
    });
    const r = res();
    await handler(req({ text: 'Hello' }), r);
    expect(r.statusCode).toBe(422);
  });
});
