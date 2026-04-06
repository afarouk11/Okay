/**
 * Jarvis post-deployment health check
 * Smoke-tests all Next.js API endpoints and reports pass/fail.
 *
 * Usage:
 *   APP_URL=https://synaptiq.co.uk node scripts/health-check.mjs
 *
 * Or against local dev server:
 *   APP_URL=http://localhost:3000 node scripts/health-check.mjs
 */

const BASE = process.env.APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
const TIMEOUT_MS = 10000;
const results = [];
let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    results.push({ name, ok: true });
    passed++;
  } catch (e) {
    console.error(`  ❌ ${name}: ${e.message}`);
    results.push({ name, ok: false, error: e.message });
    failed++;
  }
}

async function post(path, body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return { r, data: await r.json().catch(() => ({})) };
  } catch (error) {
    const reason = error.name === 'AbortError' ? 'timed out' : error.message;
    throw new Error(`POST ${path} failed: ${reason}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function get(path) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}${path}`, {
      signal: controller.signal,
    });
    return { r, data: await r.json().catch(() => ({})) };
  } catch (error) {
    const reason = error.name === 'AbortError' ? 'timed out' : error.message;
    throw new Error(`GET ${path} failed: ${reason}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

console.log(`\n🔍 Jarvis Health Check — ${BASE}\n`);

// ── /api/chat ──────────────────────────────────────────────────────────
await check('/api/chat — reachable and returns 400/401/429 on bad input', async () => {
  const { r } = await post('/api/chat', {});
  if (r.status === 503) throw new Error('Claude/Supabase service not configured (503)');
  if (![400, 401, 422, 429, 200].includes(r.status)) throw new Error(`Unexpected status ${r.status}`);
});

// ── /api/auth ──────────────────────────────────────────────────────────
await check('/api/auth — reachable and returns 400 on unknown action', async () => {
  const { r, data } = await post('/api/auth', { action: '__health_check__' });
  if (r.status === 503) throw new Error('Auth service not configured — SUPABASE_URL/KEY not set');
  if (r.status !== 400) throw new Error(`Expected 400 for unknown action, got ${r.status}`);
  if (!data.error) throw new Error('Expected error field in response');
});

await check('/api/auth — register returns 400 on missing email', async () => {
  const { r, data } = await post('/api/auth', { action: 'register', password: 'pass' });
  if (r.status === 503) throw new Error('Auth service not configured — SUPABASE_URL/KEY not set');
  if (r.status !== 400) throw new Error(`Expected 400 for missing email, got ${r.status} — ${JSON.stringify(data)}`);
});

// ── /api/notes ──────────────────────────────────────────────────────────
await check('/api/notes — reachable (returns 401/400 without auth)', async () => {
  const { r } = await get('/api/notes');
  if (![400, 401, 403, 429].includes(r.status)) throw new Error(`Unexpected status ${r.status}`);
});

// ── /api/plan ──────────────────────────────────────────────────────────
await check('/api/plan — reachable (returns 401/400 without auth)', async () => {
  const { r } = await get('/api/plan');
  if (![400, 401, 403, 429].includes(r.status)) throw new Error(`Unexpected status ${r.status}`);
});

// ── Summary ───────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\n⚠️  Fix the failing checks before going live.\n');
  process.exit(1);
} else {
  console.log('\n🚀 All checks passed — ready to go live!\n');
}
