# Synaptiq — Website Roadmap

> Generated: 31 March 2026  
> Based on: full multi-agent codebase audit (4 agents, all layers)  
> Scope: A-Level Maths only (no new subjects)

---

## Summary

The platform is fundamentally solid — auth, payments, emails, gamification, 30+ dashboard panels, and accessibility modes are all production-quality. However there are **8 critical security vulnerabilities** that must be patched before growth, several missing database migrations that will cause runtime failures, and a number of half-built features and SEO gaps.

**The order matters.** Security → Infrastructure → Quick Wins → Feature Completion → Content → Growth.

---

## Phase 0 — Critical Security
> Do these before any marketing, growth, or press coverage.

Every item here reflects a live security risk in production.

### 0.1 Lock down chat-related API access
- **Risk:** Unauthenticated or weakly controlled access to AI chat functionality can lead to uncontrolled cost exposure and abuse.
- **Mitigation:** Require strong authentication for all chat-related API calls, enforce a server-side allowlist of supported models, and cap response sizes to a safe upper bound.
- **Priority:** CRITICAL

### 0.2 Lock down text-to-speech access
- **Risk:** Unauthenticated access to text-to-speech functionality can drain third-party quotas and be used for abuse.
- **Mitigation:** Require the same level of authentication and authorization checks as other user-facing features, ensuring only valid, logged-in users can invoke TTS operations.
- **Priority:** CRITICAL

### 0.3 Secure outbound email functionality
- **Risk:** Email-sending capabilities without proper authentication and rate limiting can allow impersonation of the product and large-scale spam.
- **Mitigation:** Restrict email-sending to authenticated, authorized flows and/or internal-only usage, and ensure appropriate abuse safeguards (e.g. rate limits, template and recipient validation).
- **Priority:** CRITICAL

### 0.4 Prevent privilege escalation in profile and storage flows
- **Risk:** Profile and upload-related operations without authentication or authorization checks can allow users to read or modify other users’ data or escalate privileges.
- **Mitigation:** Enforce authentication on all profile and upload operations and ensure that callers can only act on their own data, with explicit checks for any elevated roles.
- **Priority:** CRITICAL

### 0.5 Restrict access to billing and subscription management
- **Risk:** Overly permissive access controls or cross-origin policies around billing and subscription management can expose sensitive customer billing portals.
- **Mitigation:** Require authentication and strict authorization checks for billing-related actions, and ensure cross-origin and redirect policies only allow trusted origins.
- **Priority:** CRITICAL

### 0.6 Block demo tokens in production
- **Problem:** `/api/auth` `verify` action accepts `demo_token_*` strings even when Supabase is fully configured, returning a synthetic user session.
- **Fix:** Only accept demo tokens when `!process.env.SUPABASE_URL`. Reject with 401 in production.
- **Files:** `api/auth.js` line ~200
- **Priority:** HIGH

### 0.7 Fix auto-confirm email bypass in `/api/auth`
- **Problem:** On login, if Supabase returns "email not confirmed", the handler fetches all users and auto-confirms the matching email. This bypasses email verification entirely.
- **Fix:** Remove the auto-confirm block. Return a clear 401 with a message prompting the user to verify their email. Add a "Resend verification email" UI path.
- **Files:** `api/auth.js` lines 136–147
- **Priority:** HIGH

### 0.8 Secure `/api/admin` reset_users
- **Problem:** `reset_users` permanently deletes all user accounts. Protected only by a plain-string key comparison (not timing-safe) with only a browser `confirm()` dialog.
- **Fix:** Use `crypto.timingSafeEqual` for key comparison. Add a typed-confirmation step (user must type "DELETE ALL USERS" to proceed). Add pagination so more than 1000 users can be processed.
- **Files:** `api/admin.js`
- **Priority:** HIGH

---

## Phase 1 — Infrastructure
> Fix these before scaling user numbers.

### 1.1 Create missing database migrations

**Migration 005 — `processed_webhooks` table**
```sql
CREATE TABLE processed_webhooks (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
-- Cleanup: delete events older than 30 days
CREATE INDEX idx_processed_webhooks_at ON processed_webhooks(processed_at);
```
Without this, the first Stripe webhook received in production throws a Postgres error.

**Migration 006 — `exams` table**
```sql
CREATE TABLE exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT,
  board TEXT,
  exam_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY exams_own ON exams FOR ALL USING (user_id::text = auth.uid()::text);
```
- **Files:** `supabase/migrations/005_processed_webhooks.sql`, `supabase/migrations/006_exams_table.sql`

### 1.2 Resolve flashcards storage
- `profiles.flashcards` (JSONB column in migration 001) vs separate `flashcards` table (referenced in export.js)
- **Decision:** Keep JSONB in profiles for simplicity, update `export.js` to read from `profiles.flashcards` instead of a separate table, and remove the incorrect table reference.
- **Files:** `api/export.js`, `api/auth.js` (delete_account)

### 1.3 Fix duplicate schema columns
- Profiles has both `board` + `exam_board`, `target` + `target_grade`, `year` + `year_group`
- **Fix:** Write migration 007 to drop the legacy column names (`board`, `target`, `year`), keeping only the longer descriptive names used in the API code.
- **Files:** `supabase/migrations/007_drop_legacy_columns.sql`

### 1.4 Fix `.env.example`
Add all missing variables:
```
ADMIN_SECRET_KEY=          # Required for /api/admin
STRIPE_WEBHOOK_SECRET=     # Required for /api/webhook
STRIPE_PRICE_STUDENT_ANNUAL=  # Required for annual plan
SITE_URL=https://synaptiqai.co.uk  # Used in CORS + email links
```
Fix price discrepancy: change `£20/month` to `£35/month`.
- **Files:** `.env.example`

### 1.5 Replace in-memory rate limiting with Upstash Redis
- Current `_lib.js` rate limiter uses a `Map` per serverless instance. Under concurrent load, limits are ineffective.
- **Fix:** Add `@upstash/ratelimit` + `@upstash/redis` as dependencies. Replace the `isRateLimited` function with a Redis-backed sliding window.
- Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.example`.
- **Files:** `api/_lib.js`, `.env.example`, `package.json`

### 1.6 Add JWT refresh token loop
- Supabase JWTs expire (default 1 hour). There is no refresh logic in the frontend.
- **Fix:** In `index.html`, on the `verify` response, read the `expires_at` from the Supabase session and schedule a `setTimeout` to call `supabase.auth.refreshSession()` ~5 minutes before expiry. Store the refreshed token in localStorage.
- **Files:** `index.html` (auth/verify section)

### 1.7 Fix SITE_URL fallback domain
- `api/auth.js` password reset falls back to `synaptiq.vercel.app` instead of `synaptiqai.co.uk`.
- **Fix:** Change fallback to `'https://synaptiqai.co.uk'`.
- **Files:** `api/auth.js` line ~188

---

## Phase 2 — Quick Wins
> High impact, low effort. Can be done in any order.

| # | Fix | File(s) |
|---|-----|---------|
| 2.1 | Add `sitemap.xml` listing all 10 public pages | `sitemap.xml` (new) |
| 2.2 | Add `robots.txt` blocking `/admin`, `/api`, `/test.html` | `robots.txt` (new) |
| 2.3 | Add OG + Twitter meta tags to all 8 public pages | `pricing.html`, `contact.html`, `lessons.html`, `questions.html`, `404.html`, `privacy-policy.html`, `terms.html`, `cookies.html` |
| 2.4 | Fix broken footer links — standardise on `.html` extension OR add Vercel rewrites for clean URLs | `vercel.json` + all pages |
| 2.5 | Add `<meta name="robots" content="noindex, nofollow">` to `admin.html` | `admin.html` |
| 2.6 | Add canonical tags to all public pages | All public `.html` files |
| 2.7 | Fix Newton's-laws apostrophe bug in lessons.html | `lessons.html` — escape apostrophes in topic names before interpolating into onclick attributes |
| 2.8 | Add PNG PWA icons (192×192, 512×512) | `manifest.json`, new icon files |
| 2.9 | Add PWA screenshots to manifest | `manifest.json` |
| 2.10 | Remove £35 magic number from admin.js MRR | `api/admin.js` line ~33 — use `process.env.PLAN_PRICE_GBP \|\| 35` |
| 2.11 | Fix registered address in privacy policy | `privacy-policy.html` — replace `[Your Registered Address]` |
| 2.12 | Add `applyHeaders` + rate limiting to notes.js and progress.js | `api/notes.js`, `api/progress.js` |
| 2.13 | Fix type validation in progress.js | `api/progress.js` lines 42–44 — check `Number.isInteger()` before arithmetic |
| 2.14 | Add cookie consent banner | `index.html` — implement a minimal GDPR consent banner that sets `synaptiq_consent` in localStorage |

---

## Phase 3 — Feature Completion
> Finish what's already stubbed.

### 3.1 Real Leaderboard
- **Problem:** `sp-leaderboard` generates deterministic fake data using `Math.seedrandom(weekNum)`.
- **Fix:** Wire the existing `supabase-auth.js` `leaderboard` action to the frontend. The backend query already exists and returns real top-20 XP data. Remove the fake data generator in `index.html`.
- **Files:** `index.html` (leaderboard section), `api/supabase-auth.js` (leaderboard action already complete)

### 3.2 Real Assignments
- **Problem:** `sp-assignments` has 2 hardcoded fake student assignments and a teacher form that calls `createAssignment()` with no backend.
- **Fix:**
  1. Create `/api/assignments` with CRUD (GET list, POST create, PUT update, DELETE)
  2. Create migration 008: `assignments` table (id, teacher_user_id, student_email, title, description, due_date, status)
  3. Wire `createAssignment()` in `index.html` to POST `/api/assignments`
  4. Wire student assignment list to GET `/api/assignments`
  5. Replace hardcoded sidebar badge "2" with a real unread count
- **Files:** `api/assignments.js` (new), `supabase/migrations/008_assignments.sql` (new), `index.html`

### 3.3 Real Peer Presence
- **Problem:** `"X students studying right now"` is `Math.floor(Date.now() / 480000)` — fake.
- **Fix:** Use Supabase Realtime presence channel. Track online users with a 30-second heartbeat. Display real count.
- **Files:** `index.html` (peer-presence section)

### 3.4 Daily Quests + Weekly Boss Fallback
- **Problem:** Both cards render as `"⚔️ Loading…"` with no fallback if JS functions are slow or fail.
- **Fix:** Add static fallback content that displays until the JS completes. Add error handling in the generation functions.
- **Files:** `index.html`

### 3.5 Complete Curriculum Panel
- **Problem:** `sp-curriculum` shows "Loading curriculum…" with only one hardcoded tab.
- **Fix:** Populate with the same topic structure already used in `sp-tutor` and `sp-content`. Add AQA, Edexcel, OCR, WJEC tabs.
- **Files:** `index.html`

### 3.6 Remove Dead Code
- Remove `#molecule-panel` and `#force-diagram-panel` (display:none canvases, unreachable by any user action)
- Audit `sp-repetition` — if it's fully superseded by `sp-flashcards`, remove it
- **Files:** `index.html`

### 3.7 Family Plan
- Add a Family Plan pricing tier (2 students, 1 parent dashboard)
- Add Stripe price ID for family plan
- Update pricing section in `index.html` and `pricing.html`
- Update `api/stripe.js` to handle family plan checkout
- **Files:** `index.html`, `pricing.html`, `api/stripe.js`, `.env.example`

---

## Phase 4 — Content (A-Level Maths Only)

> A-Level Maths only. No other subjects. No GCSE.

### 4.1 Fix False Subject Claims
- `contact.html` FAQ currently states: *"GCSE and A-Level subjects including Mathematics, English Literature, Physics, Chemistry, Biology, History, Geography, Computer Science, and Economics"*
- **Fix:** Update to accurately say: *"A-Level Mathematics (AQA, Edexcel, OCR, WJEC)"*
- **Files:** `contact.html`

### 4.2 AS-Level Alignment
- Year 12 AS-Level topics are inconsistently scoped across tools. Define a clear AS-Level topic set and align it across `sp-tutor`, `sp-content`, `sp-questions`, `lessons.html`, and `questions.html`
- **Files:** `index.html`, `lessons.html`, `questions.html`

### 4.3 Exam Board Parity
- MEI is in `lessons.html` but not `questions.html`
- WJEC and Eduqas coverage is uneven across tools
- **Fix:** Align board dropdowns and topic coverage across all generator tools
- **Files:** `lessons.html`, `questions.html`, `index.html`

### 4.4 Exam Prediction Data
- Currently pure AI guess with no past paper frequency data
- **Future consideration:** Embed a JSON lookup of topic frequency per board per year (manually curated from mark scheme release patterns)
- **Files:** `index.html` (sp-predict section)

---

## Phase 5 — Growth & Architecture
> Longer-term items.

### 5.1 New Marketing Pages

| Page | Purpose |
|------|---------|
| `/schools` | Dedicated landing page for school decision-makers: group pricing, teacher dashboard, compliance, case studies |
| `/about` | Team, mission, founding story — trust signal for parents and schools |
| `/accessibility` | Full accessibility statement for ADHD, Dyslexia, Dyscalculia modes |
| `/help` | Unified FAQ/help centre consolidating content from pricing, contact, lessons pages |
| `/blog` | A-Level Maths content for SEO ("how to tackle integration", "AQA mark scheme tips") |

### 5.2 Start Breaking Up index.html

The 22,407-line monolith is the single biggest long-term maintenance risk. Suggested incremental approach:

1. Extract all CSS into `src/styles.css` — no behaviour change, immediate win
2. Extract the gamification JS into `src/gamification-ui.js` (reuse existing `src/gamification.js` pure functions)
3. Extract each dashboard subpage into a `src/panels/*.js` module that registers itself
4. Use the existing `scripts/build.mjs` to bundle all modules at deploy time
5. Keep HTML as the shell, import modules via `<script type="module">`

This can be done incrementally — one panel at a time — without disrupting the live app.

### 5.3 Unify Auth Systems
- `api/auth.js` and `api/supabase-auth.js` both handle login, profile creation, and verification
- **Fix:** Designate `api/auth.js` as canonical. Migrate any unique features from `api/supabase-auth.js` (leaderboard, save_upload, get_uploads) into separate dedicated API files. Deprecate `api/supabase-auth.js`.

### 5.4 Automate Service Worker Cache Busting
- SW version (`synaptiq-v13`) is manually bumped. At scale this will be missed.
- **Fix:** In `scripts/build.mjs`, inject a build timestamp or git commit hash as the cache version at deploy time.
- **Files:** `scripts/build.mjs`, `sw.js`

---

## Effort / Impact Matrix

| Item | Effort | Impact |
|------|--------|--------|
| Phase 0 security fixes | Medium | 🔴 Critical |
| Add missing migrations (1.1) | Low | 🔴 Critical |
| Fix .env.example (1.4) | Very Low | High |
| sitemap.xml + robots.txt | Very Low | High |
| OG meta tags all pages | Low | High |
| Fix broken footer links | Very Low | High |
| Real leaderboard | Low | High |
| Fix false subject claims | Very Low | High |
| Upstash Redis rate limiting | Medium | Medium |
| JWT refresh loop | Medium | Medium |
| Real assignments backend | High | Medium |
| AS-Level alignment across tools | Medium | Medium |
| /schools landing page | Medium | Medium |
| Break up index.html | Very High | Low (long-term) |
| Unify auth systems | High | Low (long-term) |

---

## Environment Variables — Complete Reference

| Variable | Required | Used in | Notes |
|----------|----------|---------|-------|
| `SUPABASE_URL` | Yes | All DB handlers | |
| `SUPABASE_SERVICE_KEY` | Yes | All DB handlers | Never expose client-side |
| `SUPABASE_ANON_KEY` | Yes | `supabase-auth.js` | Safe for client use |
| `ANTHROPIC_API_KEY` | Yes | `chat.js` | Add auth gate first |
| `ELEVENLABS_API_KEY` | Optional | `tts.js` | Falls back to browser TTS |
| `STRIPE_SECRET_KEY` | Yes | `stripe.js`, `webhook.js` | |
| `STRIPE_PRICE_STUDENT` | Yes | `stripe.js` | £35/month |
| `STRIPE_PRICE_STUDENT_ANNUAL` | Yes | `stripe.js` | £199/year — not in .env.example |
| `STRIPE_PRICE_HOMESCHOOL` | Yes | `stripe.js` | |
| `STRIPE_WEBHOOK_SECRET` | Yes | `webhook.js` | Not in .env.example |
| `RESEND_API_KEY` | Yes | `resend.js`, `auth.js` | |
| `ADMIN_SECRET_KEY` | Yes | `admin.js` | Not in .env.example |
| `SITE_URL` | Yes | `_lib.js`, `auth.js`, `resend.js` | `https://synaptiqai.co.uk` |
| `GA4_MEASUREMENT_ID` | Optional | `scripts/build.mjs` | Injected at build time |
| `UPSTASH_REDIS_REST_URL` | Phase 1.5 | `_lib.js` | |
| `UPSTASH_REDIS_REST_TOKEN` | Phase 1.5 | `_lib.js` | |

---

*See `mindmap.html` for an interactive visual version of this roadmap.*
