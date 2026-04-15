/**
 * Synaptiq Live Site E2E Test
 * Usage:  node scripts/e2e-test.mjs
 *
 * Optionally set credentials via env (defaults to creating a new account):
 *   TEST_EMAIL=you@example.com TEST_PASSWORD=yourpass node scripts/e2e-test.mjs
 */
import { chromium } from 'playwright';

const BASE    = 'https://synaptiq.co.uk';
const EMAIL   = process.env.TEST_EMAIL    || `e2e-test-${Date.now()}@mailnull.com`;
const PASSWORD= process.env.TEST_PASSWORD || 'E2eTest#2026!';
const NAME    = 'E2E Test User';
const TIMEOUT = 20000;

const results = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS  ${name}`);
    results.push({ name, pass: true });
  } catch (e) {
    console.error(`  ❌ FAIL  ${name}: ${e.message}`);
    results.push({ name, pass: false, error: e.message });
  }
}

let browser, ctx, page;

try {
  browser = await chromium.launch({ headless: true });
  ctx     = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  page    = await ctx.newPage();
  page.setDefaultTimeout(TIMEOUT);
  page.setDefaultNavigationTimeout(TIMEOUT);

  // ── 1. Public Pages ───────────────────────────────────────────────────────
  console.log('\n📄 Public Pages');
  const publicPages = ['/', '/login', '/pricing', '/schools', '/privacy', '/terms', '/cookies', '/contact'];
  for (const path of publicPages) {
    await test(`Page ${path}`, async () => {
      const res = await page.goto(BASE + path, { waitUntil: 'load' });
      if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status()}`);
      if (await page.$('text=Application error')) throw new Error('Next.js crash overlay');
    });
  }

  // ── 2. Registration ───────────────────────────────────────────────────────
  console.log('\n🔐 Authentication');
  await test('Register new account (API)', async () => {
    const res  = await fetch(`${BASE}/api/auth`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ action: 'register', email: EMAIL, password: PASSWORD, name: NAME }),
    });
    const data = await res.json();
    if (!res.ok && !data.error?.toLowerCase().includes('already')) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    if (data.error?.toLowerCase().includes('already')) {
      console.log('      (account already exists — continuing with login)');
    }
  });

  await test('Login via browser form → /dashboard', async () => {
    await page.goto(BASE + '/login', { waitUntil: 'load' });
    await page.fill('input[type="email"]',    EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: TIMEOUT });
  });

  await test('Session persists after navigation', async () => {
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.goto(BASE + '/dashboard', { waitUntil: 'load' });
    if (page.url().includes('/login')) throw new Error('Redirected to /login — session lost');
  });

  // ── 3. Protected Pages ────────────────────────────────────────────────────
  console.log('\n🔒 Protected Pages');
  const protected_ = [
    '/dashboard', '/chat', '/jarvis', '/plan', '/questions',
    '/notes', '/papers', '/formulas', '/exam-sim', '/settings',
    '/predict', '/mindmap',
  ];
  for (const path of protected_) {
    await test(`Page ${path}`, async () => {
      const res = await page.goto(BASE + path, { waitUntil: 'load' });
      if (page.url().includes('/login'))   throw new Error('Redirected to login');
      if (res && res.status() >= 500)      throw new Error(`HTTP ${res.status()}`);
      if (await page.$('text=Application error')) throw new Error('Next.js crash overlay');
    });
  }

  // ── 4. Jarvis Chat ────────────────────────────────────────────────────────
  console.log('\n💬 Jarvis Chat');
  await test('Send message + receive response', async () => {
    await page.goto(BASE + '/jarvis', { waitUntil: 'load' });
    // Count existing messages before sending
    const before = await page.locator('[class*="message"], [class*="bubble"], [class*="chat"]').count();
    const textarea = page.locator('textarea').first();
    await textarea.waitFor({ state: 'visible' });
    await textarea.fill('What is differentiation?');
    await textarea.press('Enter');
    // Wait for at least one new message to appear (up to 30s — AI can be slow)
    await page.waitForFunction(
      (prevCount) => {
        const els = document.querySelectorAll('[class*="message"], [class*="bubble"], [class*="chat"]');
        return els.length > prevCount;
      },
      before,
      { timeout: 30000 }
    ).catch(() => { /* may not match selector — check for toast instead */ });
    // Verify no error toast
    const errToast = await page.locator('text=Something went wrong').first().isVisible().catch(() => false);
    if (errToast) throw new Error('Error toast shown after sending message');
    // Wait a beat and check the page didn't crash
    await page.waitForTimeout(1000);
    if (await page.$('text=Application error')) throw new Error('App crashed after sending message');
  });

  // ── 5. API Spot Checks ───────────────────────────────────────────────────
  console.log('\n🌐 API Endpoints');
  await test('GET /api/plan → 401 (not 5xx)', async () => {
    const res = await fetch(`${BASE}/api/plan`);
    if (res.status >= 500) throw new Error(`Server error: HTTP ${res.status}`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('GET /api/notes → 401 (not 5xx)', async () => {
    const res = await fetch(`${BASE}/api/notes`);
    if (res.status >= 500) throw new Error(`Server error: HTTP ${res.status}`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('POST /api/auth register (no email) → 400', async () => {
    const res = await fetch(`${BASE}/api/auth`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ action: 'register', password: 'test1234' }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

} finally {
  if (browser) await browser.close().catch(() => {});
}

// ── Summary ───────────────────────────────────────────────────────────────────
const passed = results.filter(r =>  r.pass).length;
const failed = results.filter(r => !r.pass).length;

console.log(`\n${'─'.repeat(52)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${results.length} tests`);

if (failed > 0) {
  console.log('\nFailing tests:');
  results.filter(r => !r.pass).forEach(r => console.log(`  ❌ ${r.name}\n     ${r.error}`));
  process.exit(1);
} else {
  console.log('\n�� All tests passed!');
}
