import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  webpack: (config, { dev, isServer }) => {
    // Suppress warnings
    config.stats = 'errors-only';
    config.infrastructureLogging = {
      level: 'error',
    };

    // Ignore specific warnings
    config.ignoreWarnings = [
      /Module not found/,
      /Can't resolve/,
      /Critical dependency/,
      /the request of a dependency is an expression/,
    ];

    return config;
  },
};

export default nextConfig;
