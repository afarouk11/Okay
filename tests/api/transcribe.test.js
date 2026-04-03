/**
 * Tests for api/transcribe.js — Deepgram speech-to-text endpoint.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import handler from '../../api/transcribe.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a mock request that emits data/end/error events like a Node.js stream,
 * matching the getRawBody() pattern used in the handler.
 *
 * @param {Buffer|null} audioData  - Audio bytes to emit, or null for an error.
 * @param {string}      method
 * @param {string}      contentType
 * @param {Error|null}  streamError - If set, emits an 'error' event instead of data.
 */
function makeReq(audioData = Buffer.from([0xff, 0xd8, 0xff]), method = 'POST', contentType = 'audio/webm', streamError = null) {
  const listeners = {};
  const r = {
    method,
    headers: {
      'x-forwarded-for': '1.2.3.4',
      'content-type': contentType,
    },
    on(event, cb) {
      listeners[event] = cb;
      // After all three listeners are registered ('data', 'end', 'error'),
      // schedule the stream emission so getRawBody() resolves cleanly.
      if (event === 'error') {
        setImmediate(() => {
          if (streamError) {
            listeners.error?.(streamError);
          } else {
            if (audioData && audioData.length > 0) {
              listeners.data?.(audioData);
            }
            listeners.end?.();
          }
        });
      }
      return this;
    },
  };
  return r;
}

function res() {
  const r = { statusCode: 200, body: null };
  r.setHeader = () => r;
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (d) => { r.body = d; return r; };
  r.end = () => r;
  return r;
}

function deepgramResponse(transcript = '') {
  return {
    results: {
      channels: [
        {
          alternatives: [{ transcript, confidence: 0.99 }],
        },
      ],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.DEEPGRAM_API_KEY;
});

afterEach(() => {
  delete process.env.DEEPGRAM_API_KEY;
});

// ─── OPTIONS ──────────────────────────────────────────────────────────────────

describe('OPTIONS', () => {
  it('returns 200', async () => {
    const r = res();
    await handler(makeReq(null, 'OPTIONS'), r);
    expect(r.statusCode).toBe(200);
  });
});

// ─── Non-POST ─────────────────────────────────────────────────────────────────

describe('non-POST', () => {
  it('returns 405 for GET', async () => {
    process.env.DEEPGRAM_API_KEY = 'dg-key';
    const r = res();
    await handler(makeReq(null, 'GET'), r);
    expect(r.statusCode).toBe(405);
    expect(r.body.error).toMatch(/method/i);
  });
});

// ─── Missing API key ──────────────────────────────────────────────────────────

describe('missing DEEPGRAM_API_KEY', () => {
  it('returns 503', async () => {
    const r = res();
    await handler(makeReq(), r);
    expect(r.statusCode).toBe(503);
    expect(r.body.error).toMatch(/transcription/i);
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('validation', () => {
  beforeEach(() => { process.env.DEEPGRAM_API_KEY = 'dg-key'; });

  it('returns 400 when body is empty', async () => {
    const r = res();
    await handler(makeReq(Buffer.alloc(0)), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/audio/i);
  });

  it('returns 400 when stream errors', async () => {
    const r = res();
    await handler(makeReq(null, 'POST', 'audio/webm', new Error('stream error')), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toMatch(/audio/i);
  });
});

// ─── Successful transcription ─────────────────────────────────────────────────

describe('successful transcription', () => {
  beforeEach(() => { process.env.DEEPGRAM_API_KEY = 'dg-key'; });

  it('returns the transcript from Deepgram', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(deepgramResponse('What is two plus two?')),
    });
    const r = res();
    await handler(makeReq(), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.transcript).toBe('What is two plus two?');
  });

  it('calls Deepgram with the correct Authorization header', async () => {
    process.env.DEEPGRAM_API_KEY = 'my-deepgram-key';
    let capturedHeaders;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedHeaders = opts.headers;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(deepgramResponse('hello')) });
    });
    await handler(makeReq(), res());
    expect(capturedHeaders['Authorization']).toBe('Token my-deepgram-key');
  });

  it('passes the Content-Type from the request to Deepgram', async () => {
    let capturedHeaders;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedHeaders = opts.headers;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(deepgramResponse('hi')) });
    });
    await handler(makeReq(Buffer.from([1, 2, 3]), 'POST', 'audio/mp4'), res());
    expect(capturedHeaders['Content-Type']).toBe('audio/mp4');
  });

  it('calls the nova-2 model endpoint', async () => {
    let capturedUrl;
    global.fetch = vi.fn().mockImplementationOnce((url) => {
      capturedUrl = url;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(deepgramResponse('test')) });
    });
    await handler(makeReq(), res());
    expect(capturedUrl).toContain('nova-2');
  });

  it('defaults content-type to audio/webm when header is absent', async () => {
    let capturedHeaders;
    global.fetch = vi.fn().mockImplementationOnce((_url, opts) => {
      capturedHeaders = opts.headers;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(deepgramResponse('test')) });
    });
    const r = makeReq();
    delete r.headers['content-type'];
    await handler(r, res());
    expect(capturedHeaders['Content-Type']).toBe('audio/webm');
  });
});

// ─── Empty transcript ─────────────────────────────────────────────────────────

describe('empty transcript', () => {
  beforeEach(() => { process.env.DEEPGRAM_API_KEY = 'dg-key'; });

  it('returns 422 when Deepgram returns an empty transcript', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(deepgramResponse('')),
    });
    const r = res();
    await handler(makeReq(), r);
    expect(r.statusCode).toBe(422);
    expect(r.body.error).toMatch(/transcribe/i);
  });
});

// ─── Deepgram API error ───────────────────────────────────────────────────────

describe('Deepgram API error', () => {
  beforeEach(() => { process.env.DEEPGRAM_API_KEY = 'dg-key'; });

  it('forwards the upstream status code on failure', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad audio format'),
    });
    const r = res();
    await handler(makeReq(), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 503 on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));
    const r = res();
    await handler(makeReq(), r);
    expect(r.statusCode).toBe(503);
    expect(r.body.error).toMatch(/unavailable/i);
  });
});
