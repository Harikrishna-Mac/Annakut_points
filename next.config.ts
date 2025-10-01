const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,

  // ✅ Needed for Cloudflare Pages deployment
  output: "standalone",

  // ✅ Cloudflare doesn't support Next.js Image Optimization
  images: {
    unoptimized: true,
    domains: [
      "firebasestorage.googleapis.com",
      "img.clerk.com", // 👈 Clerk profile images
    ],
  },
});

module.exports = nextConfig;
