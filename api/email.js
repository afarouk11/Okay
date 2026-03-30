/**
 * POST /api/email  — alias for /api/resend
 * Accepts the same `{type, email, name, stats}` body and delegates to the
 * unified resend handler so that all client-side fetch('/api/email') calls work.
 */
export { default } from './resend.js';
