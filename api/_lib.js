/**
 * Shared utilities for all API handlers.
 * Provides: CORS, security headers, rate limiting.
 */

// ─── CORS & Security Headers ─────────────────────────────────────────────────

export function applyHeaders(res, methods = 'POST, OPTIONS') {
  const origin = process.env.SITE_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key, x-internal-key, x-internal-secret');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────
//
// In-memory per-serverless-instance store. Each Vercel instance gets its own
// counter, so limits are approximate across concurrent instances — but they
// still protect against rapid single-source abuse within a window.
//
// To scale this to production-grade distributed rate limiting with Upstash Redis:
//   1. npm install @upstash/redis
//   2. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
//   3. Replace the in-memory store with:
//      import { Redis } from '@upstash/redis';
//      const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL,
//                                token: process.env.UPSTASH_REDIS_REST_TOKEN });
//   4. In isRateLimited: use redis.incr(key) + redis.expire(key, windowSeconds)
//      and compare the count against `max`.

const store = new Map();

/**
 * Returns true when the caller has exceeded the limit.
 *
 * @param {string} key    - A unique key, e.g. `${ip}:${endpoint}`
 * @param {number} max    - Max requests allowed in the window
 * @param {number} windowMs - Window duration in milliseconds
 */
export function isRateLimited(key, max = 30, windowMs = 60_000) {
  // In Vitest test runs the store is shared across all tests in the process,
  // so bypassing prevents rate limits from leaking between test cases.
  if (process.env.VITEST) return false;

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;
  return entry.count > max;
}

// Clean up expired rate limit entries every 5 minutes to prevent memory growth
if (!process.env.VITEST) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 5 * 60_000).unref();
}

/** Extract the caller's real IP from Vercel/proxy headers. */
export function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// ─── Fetch with retry ─────────────────────────────────────────────────────────
//
// Retries only on network-level failures (when fetch throws), NOT on HTTP error
// status codes. HTTP errors are intentionally passed back to the caller so they
// can forward the upstream status (e.g. Anthropic 529 overloaded).
//
// Backoff: 500ms → 1 000ms (doubles each attempt, capped at maxRetries).
// Zero-delay in Vitest so tests stay fast.

/**
 * Calls fetch and retries on transient network errors with exponential backoff.
 *
 * @param {string}      url
 * @param {RequestInit} [options]
 * @param {number}      [maxRetries=2]  Extra attempts after the first (total: maxRetries+1)
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, maxRetries = 2) {
  const baseDelay = process.env.VITEST ? 0 : 500;
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, baseDelay * (2 ** attempt)));
      }
    }
  }
  throw lastError;
}
