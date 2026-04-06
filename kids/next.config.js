/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/kids',
  trailingSlash: true,
  images: { unoptimized: true },
}
module.exports = nextConfig
