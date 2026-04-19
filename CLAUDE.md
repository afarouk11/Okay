# Synaptiq — Codebase Guide

## Architecture

This is a **Next.js 15 App Router** project deployed on Vercel.

- **`app/`** — Next.js App Router pages and API routes (`app/api/*/route.ts`)
- **`components/`** — Shared React components
- **`lib/`** — Shared utilities (Supabase client, rate limiting, Claude wrapper)
- **`src/`** — Legacy browser-only scripts (e.g. `jarvis.js` — excluded from test coverage)
- **`kids/`** — Standalone kids-mode pages (excluded from tests)
- **`tests/`** — Vitest test suite

## `api/` directory — test shim layer

The `api/` directory contains **Express-style handler files** (`handler(req, res)`) that exist **solely to support the Vitest test suite** in `tests/api/`.

The real application uses Next.js App Router handlers in `app/api/*/route.ts` (which use `NextRequest`/`NextResponse`). The `api/` shims mirror the same business logic in an Express-compatible interface so tests can call them directly without spinning up a Next.js server.

**Do not use `api/*.js` files in production code.** If you modify business logic in `app/api/*/route.ts`, mirror the change in the corresponding `api/*.js` shim to keep tests passing.

## Running tests

```bash
npm test              # run full test suite
npx vitest run        # same, explicit
npx vitest --coverage # with coverage report
```

## Environment variables

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Supabase backend |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client-side |
| `RESEND_API_KEY` | Email delivery |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Payments |
| `ANTHROPIC_API_KEY` | Claude AI |
| `ELEVENLABS_API_KEY` / `ELEVEN_AGENT_ID` | TTS / Jarvis agent |
| `DEEPGRAM_API_KEY` | Speech-to-text |
| `INTERNAL_API_KEY` | Server-to-server auth between API routes |
| `ADMIN_SECRET_KEY` | Admin dashboard access |

When env vars are absent, handlers run in **demo mode** — returning stub data without hitting external services.
