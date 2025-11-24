import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Set the workspace root to silence the multiple lockfiles warning
  outputFileTracingRoot: process.cwd(),
  webpack: (config, { isServer }) => {
    // Exclude Node.js-only modules from client-side bundle
    // This prevents pdfjs-dist from trying to require 'canvas' in the browser
    if (!isServer) {
      // Use alias to prevent canvas from being bundled
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };

      // Also set fallback for additional Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
  // Add empty turbopack config to silence warning when webpack is explicitly used
  turbopack: {},
};

export default nextConfig;
