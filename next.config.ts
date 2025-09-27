const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
});

const nextConfig = withPWA({
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
});

module.exports = nextConfig;
