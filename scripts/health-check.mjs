/**
 * Synaptiq post-deployment health check
 * Smoke-tests all 4 API endpoints and reports pass/fail.
 *
 * Usage:
 *   APP_URL=https://synaptiq.co.uk node scripts/health-check.mjs
 *
 * Or against local dev server:
 *   APP_URL=http://localhost:3000 node scripts/health-check.mjs
 */

const BASE = process.env.APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
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
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { r, data: await r.json() };
}

console.log(`\n🔍 Synaptiq Health Check — ${BASE}\n`);

// ── /api/chat ─────────────────────────────────────────────────────────────────
await check('/api/chat — reachable and returns 400/401/200', async () => {
  const { r } = await post('/api/chat', {});
  if (r.status === 500 && (await r.clone().json().catch(() => ({}))).error?.includes('Missing API key')) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  if (![400, 401, 422, 200].includes(r.status)) throw new Error(`Unexpected status ${r.status}`);
});

// ── /api/supabase-auth ────────────────────────────────────────────────────────
await check('/api/supabase-auth — reachable and returns structured error on bad action', async () => {
  const { r, data } = await post('/api/supabase-auth', { action: '__health_check__' });
  if (r.status === 500 && data.error?.includes('Missing Supabase config')) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_KEY not set');
  }
  if (r.status !== 400) throw new Error(`Expected 400 for unknown action, got ${r.status}`);
  if (!data.error) throw new Error('Expected error field in response');
});

await check('/api/supabase-auth — verify_login returns 401 on bad credentials', async () => {
  const { r, data } = await post('/api/supabase-auth', {
    action: 'verify_login',
    payload: { email: 'healthcheck-nonexistent@synaptiq.co.uk', password: 'wrong-password-12345' }
  });
  if (r.status === 500 && data.error?.includes('Missing SUPABASE_ANON_KEY')) {
    throw new Error('SUPABASE_ANON_KEY not set');
  }
  if (r.status !== 401) throw new Error(`Expected 401, got ${r.status} — ${JSON.stringify(data)}`);
});

// ── /api/stripe ───────────────────────────────────────────────────────────────
await check('/api/stripe — reachable and returns error without valid price ID', async () => {
  const { r, data } = await post('/api/stripe', { plan: 'student', email: 'test@test.com' });
  if (r.status === 500 && data.error?.includes('Missing Stripe key')) {
    throw new Error('STRIPE_SECRET_KEY not set');
  }
  // 400 = invalid price ID (env var placeholder), 200 = real Stripe session — both OK
  if (![200, 400].includes(r.status)) throw new Error(`Unexpected status ${r.status}: ${data.error}`);
});

// ── /api/resend ───────────────────────────────────────────────────────────────
await check('/api/resend — reachable (does not actually send email)', async () => {
  const { r, data } = await post('/api/resend', {});
  if (r.status === 500 && data.error?.includes('Missing Resend key')) {
    throw new Error('RESEND_API_KEY not set');
  }
  // 400 = missing recipient (expected — we didn't pass an email)
  if (r.status !== 400) throw new Error(`Unexpected status ${r.status}`);
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\n⚠️  Fix the failing checks before going live.\n');
  process.exit(1);
} else {
  console.log('\n🚀 All checks passed — ready to go live!\n');
}
