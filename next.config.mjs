/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
