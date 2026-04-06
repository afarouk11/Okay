/**
 * Legacy HTML shim build script.
 *
 * The canonical site now runs through the Next.js `app/` router, so no build-time
 * HTML mutation is required anymore. This script remains only as a safe compatibility
 * hook for old deployment docs and local workflows.
 */

const ga4Id = process.env.GA4_MEASUREMENT_ID
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (ga4Id && ga4Id !== 'G-XXXXXXXX') {
  console.log(`ℹ️  GA4 configured for Next.js runtime: ${ga4Id}`)
} else {
  console.log('ℹ️  GA4_MEASUREMENT_ID not set — analytics disabled')
}

if (supabaseUrl && supabaseAnon) {
  console.log('ℹ️  Supabase public environment variables detected for Next.js runtime')
} else {
  console.warn('⚠️  SUPABASE_URL / SUPABASE_ANON_KEY not set — auth will not work')
}

console.log('✅ Next.js build compatibility check complete')
