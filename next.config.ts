import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.3"],
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost", "local-origin.dev", "*.local-origin.dev"],
    },
  },
};

export default nextConfig;
