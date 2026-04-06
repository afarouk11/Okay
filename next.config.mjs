const legacyHtmlRedirects = [
  { source: '/index.html', destination: '/', permanent: true },
  { source: '/admin.html', destination: '/admin', permanent: true },
  { source: '/contact.html', destination: '/contact', permanent: true },
  { source: '/cookies.html', destination: '/cookies', permanent: true },
  { source: '/integration-by-parts.html', destination: '/integration-by-parts', permanent: true },
  { source: '/jarvis.html', destination: '/jarvis', permanent: true },
  { source: '/kids.html', destination: '/kids', permanent: true },
  { source: '/lessons.html', destination: '/lessons', permanent: true },
  { source: '/mindmap.html', destination: '/mindmap', permanent: true },
  { source: '/parent.html', destination: '/parent', permanent: true },
  { source: '/pricing.html', destination: '/pricing', permanent: true },
  { source: '/privacy-policy.html', destination: '/privacy', permanent: true },
  { source: '/questions.html', destination: '/questions', permanent: true },
  { source: '/reset-password.html', destination: '/reset-password', permanent: true },
  { source: '/schools.html', destination: '/schools', permanent: true },
  { source: '/terms.html', destination: '/terms', permanent: true },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return legacyHtmlRedirects
  },
  webpack: (config) => {
    // iceberg-js is an optional S3-protocol dep of @supabase/storage-js that
    // is not required for standard Supabase usage. Mark it as false so webpack
    // skips it rather than failing the build.
    config.resolve.alias = {
      ...config.resolve.alias,
      'iceberg-js': false,
    }
    return config
  },
}

export default nextConfig
