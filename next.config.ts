import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/admin/seed": ["./scripts/seed-data/private/*.json"],
  },
  allowedDevOrigins: ["192.168.1.3", "192.168.0.106"],
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost", "local-origin.dev", "*.local-origin.dev"],
    },
  },
};

export default nextConfig;
