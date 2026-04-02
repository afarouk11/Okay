/**
 * Synaptiq build script
 * Runs before deployment to inject environment variables into HTML files.
 *
 * Usage: node scripts/build.mjs
 * Called automatically by Vercel via the "build" script in package.json.
 *
 * Set these in Vercel → Project → Settings → Environment Variables:
 *   GA4_MEASUREMENT_ID   — e.g. G-ABC123DEF4
 *   ELEVEN_AGENT_ID      — ElevenLabs Conversational AI agent ID (for JARVIS voice)
 *                          Served at runtime via /api/jarvis-config — no build injection needed.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

let html = readFileSync(join(root, 'index.html'), 'utf8');
let changed = false;

// ── Inject GA4 Measurement ID ─────────────────────────────────────────────────
const ga4Id = process.env.GA4_MEASUREMENT_ID;
if (ga4Id && ga4Id !== 'G-XXXXXXXX') {
  html = html.replace(
    /<meta name="ga4-id" content="[^"]*">/,
    `<meta name="ga4-id" content="${ga4Id}">`
  );
  console.log(`✅ GA4 ID injected: ${ga4Id}`);
  changed = true;
} else {
  console.log('ℹ️  GA4_MEASUREMENT_ID not set — analytics disabled');
}

// ── Inject Supabase public keys ───────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (supabaseUrl && supabaseAnon) {
  const safeUrl  = supabaseUrl.replace(/'/g, "\\'");
  const safeAnon = supabaseAnon.replace(/'/g, "\\'");
  const keyScript = `<script>window.SUPABASE_URL='${safeUrl}';window.SUPABASE_ANON_KEY='${safeAnon}';</script>`;
  if (!html.includes('window.SUPABASE_URL=')) {
    html = html.replace('</head>', `${keyScript}\n</head>`);
    console.log('✅ Supabase public keys injected');
    changed = true;
  }
} else {
  console.warn('⚠️  SUPABASE_URL / SUPABASE_ANON_KEY not set — auth will not work');
}

if (changed) {
  writeFileSync(join(root, 'index.html'), html, 'utf8');
  console.log('✅ index.html updated');
}

// ── Inject Supabase keys into standalone HTML pages ───────────────────────────
if (supabaseUrl && supabaseAnon) {
  const safeUrl  = supabaseUrl.replace(/'/g, "\\'");
  const safeAnon = supabaseAnon.replace(/'/g, "\\'");
  const keyScript = `<script>window.SUPABASE_URL='${safeUrl}';window.SUPABASE_ANON_KEY='${safeAnon}';</script>`;
  for (const page of ['questions.html', 'lessons.html', 'reset-password.html']) {
    const pageHtml = readFileSync(join(root, page), 'utf8');
    if (!pageHtml.includes('window.SUPABASE_URL=')) {
      const updated = pageHtml.replace('</head>', `${keyScript}\n</head>`);
      writeFileSync(join(root, page), updated, 'utf8');
      console.log(`✅ Supabase keys injected into ${page}`);
    }
  }
}

console.log('✅ Build complete');
