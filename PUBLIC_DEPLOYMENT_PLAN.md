# Public Deployment Plan

## Current state

The site is already on **Next.js 15** with the App Router, public marketing pages, authenticated dashboard flows, Stripe billing endpoints, Supabase auth/data, and email/contact APIs.

## Work completed in this pass

- Hardened `app/api/stripe/route.ts` with authenticated checkout email usage and same-origin redirect validation.
- Hardened `app/api/admin/route.ts` with timing-safe admin key comparison.
- Added `supabase/migrations/010_harden_rls_policies.sql` to lock user tables to the owning account and keep admin/webhook tables service-role only.
- Changed contact/email endpoints to fail clearly when email delivery is not configured.
- Wired the Settings page to a real `delete_account` action.
- Wired the Pricing page to launch live checkout sessions instead of only linking back to the dashboard.
- Added deploy-safe dynamic handling to sensitive API routes and refreshed stale service-worker core assets.
- Strengthened CSP and form/frame restrictions in `vercel.json`.
- Fixed wrong domain (`synaptiqai.co.uk` → `synaptiq.co.uk`) in sitemap.xml, robots.txt, and layout.tsx fallback URL (all root and public/ copies).
- Fixed CI workflow to run `typecheck` and `test` as separate steps.
- Added `/schools` to sitemap; corrected `/privacy-policy` → `/privacy` in public/sitemap.xml.

## Launch checklist

### 1. Security and environment
- [x] Validate billing redirect URLs and keep checkout same-origin.
- [x] Use timing-safe secret comparison for admin access.
- [x] Return explicit `503` errors when transactional email is not configured.
- [x] Add `force-dynamic` / `revalidate = 0` to critical API routes.
- [ ] Set all production env vars in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_STUDENT`
  - `STRIPE_PRICE_STUDENT_ANNUAL`
  - `STRIPE_PRICE_HOMESCHOOL`
  - `RESEND_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `SITE_URL` / `APP_URL`
  - `INTERNAL_API_KEY`
  - `ADMIN_SECRET_KEY`
- [x] Added a repo migration to enable and harden RLS on the user-owned Supabase tables.
- [ ] Apply the latest Supabase migrations / SQL in the production project.
- [ ] Restrict admin access to trusted operators only.

### 2. Product functionality
- [x] Make pricing CTA open a real checkout flow.
- [x] Enable self-serve account deletion from Settings.
- [x] Add timeout feedback for invalid/expired reset-password sessions.
- [ ] Run full end-to-end smoke tests for:
  - signup/login/logout
  - forgot-password/reset-password
  - contact form
  - Stripe checkout + webhook activation
  - billing portal
  - delete account flow
  - core Jarvis chat flow

### 3. Next.js and deployment readiness
- [x] Keep the app on modern Next.js App Router patterns.
- [x] Refresh service-worker cache targets to canonical routes.
- [x] Add webhook health-check support.
- [x] Run `npm run build`, `npm run typecheck`, and `npm test` in CI on every push.
- [x] Verify metadata, sitemap, robots, and canonical URLs on the production domain.
- [ ] Add uptime monitoring and error tracking for `/api/chat`, `/api/stripe`, `/api/webhook`, and `/api/resend`.

### 4. Go-live steps
1. Deploy to Vercel preview.
2. Test auth, billing, email, and dashboard flows on preview.
3. Point Stripe webhook to `/api/webhook`.
4. Verify Resend sending domain and support inbox.
5. Promote preview to production.
6. Monitor logs, payments, and support submissions for the first 48 hours.

## Recommended merge order

1. **Security + billing hardening**
2. **Account/settings UX fixes**
3. **Deployment config + monitoring**
4. **Preview QA sign-off**
5. **Merge to production branch / main**
