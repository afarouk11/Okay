/**
 * Tests for fetchWithRetry in api/_lib.js
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from '../../api/_lib.js';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  delete global.fetch;
});

// ─── Successful first attempt ─────────────────────────────────────────────────

describe('successful first attempt', () => {
  it('returns the response immediately without retrying', async () => {
    const mockResponse = { status: 200, json: () => Promise.resolve({ ok: true }) };
    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    const result = await fetchWithRetry('https://example.com', {});

    expect(result).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('passes the url and options straight through to fetch', async () => {
    const mockResponse = { status: 200 };
    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);
    const options = { method: 'POST', body: '{"x":1}' };

    await fetchWithRetry('https://api.example.com/test', options);

    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/test', options);
  });
});

// ─── Retry on network error ───────────────────────────────────────────────────

describe('retry on network error', () => {
  it('retries and succeeds on the second attempt', async () => {
    const mockResponse = { status: 200 };
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce(mockResponse);

    const result = await fetchWithRetry('https://example.com', {}, 2);

    expect(result).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('retries up to maxRetries times then throws the last error', async () => {
    const networkErr = new Error('Network timeout');
    global.fetch = vi.fn().mockRejectedValue(networkErr);

    await expect(fetchWithRetry('https://example.com', {}, 2)).rejects.toThrow('Network timeout');
    // 1 initial attempt + 2 retries = 3 total
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('does not retry when maxRetries is 0', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('DNS failure'));

    await expect(fetchWithRetry('https://example.com', {}, 0)).rejects.toThrow('DNS failure');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

// ─── HTTP error responses are NOT retried ────────────────────────────────────
//
// fetch() resolves (does not throw) for 4xx/5xx responses.
// fetchWithRetry must return them as-is — callers decide how to handle them.

describe('HTTP error responses are not retried', () => {
  it('returns a 429 response without retrying', async () => {
    const rateLimitResp = { status: 429, ok: false };
    global.fetch = vi.fn().mockResolvedValueOnce(rateLimitResp);

    const result = await fetchWithRetry('https://example.com', {}, 2);

    expect(result).toBe(rateLimitResp);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns a 500 response without retrying', async () => {
    const serverErrResp = { status: 500, ok: false };
    global.fetch = vi.fn().mockResolvedValueOnce(serverErrResp);

    const result = await fetchWithRetry('https://example.com', {}, 2);

    expect(result).toBe(serverErrResp);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

// ─── Default maxRetries ───────────────────────────────────────────────────────

describe('default maxRetries (2)', () => {
  it('makes 3 total attempts (1 initial + 2 retries) before throwing', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(fetchWithRetry('https://example.com')).rejects.toThrow('fail');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
