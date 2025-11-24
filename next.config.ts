import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Set the workspace root to silence the multiple lockfiles warning
  outputFileTracingRoot: process.cwd(),
  webpack: (config, { isServer, webpack }) => {
    // Exclude Node.js-only modules from client-side bundle
    // This prevents pdfjs-dist from trying to require 'canvas' in the browser
    if (!isServer) {
      // Create a stub module path
      const canvasStubPath = path.resolve(process.cwd(), 'lib/canvas-stub.js');

      // Use NormalModuleReplacementPlugin to replace canvas with our stub
      // This replaces ALL require('canvas') calls with our stub module
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^canvas$/, canvasStubPath));

      // Use alias to redirect canvas to stub (as backup)
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: canvasStubPath,
      };

      // Set fallback for Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: canvasStubPath,
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
