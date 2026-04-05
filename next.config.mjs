/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow the existing vanilla JS HTML pages to coexist.
  // Next.js serves from /app; old HTML pages are served as static files.

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',   value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-XSS-Protection',          value: '1; mode=block' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(self), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://esm.sh",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
              "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
              "img-src 'self' data: https:",
              "connect-src 'self' https://api.anthropic.com https://api.stripe.com https://*.supabase.co https://www.google-analytics.com https://esm.sh https://api.elevenlabs.io wss://api.elevenlabs.io wss://*.livekit.cloud https://*.livekit.cloud wss://*.livekit.io https://*.livekit.io",
              "worker-src 'self' blob: https://esm.sh",
              "frame-src https://js.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
