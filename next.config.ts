import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    staleTimes: {
      // Keep prefetched authenticated screens warm long enough for normal tab
      // navigation. Explicit router.refresh() calls still fetch fresh data after
      // mutations such as accepting or submitting a task.
      dynamic: 30,
    },
  },
};

export default nextConfig;
