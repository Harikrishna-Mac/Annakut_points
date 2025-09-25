/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // skip ESLint errors
  },
  typescript: {
    ignoreBuildErrors: true, // skip TypeScript errors
  },
};

module.exports = nextConfig;
