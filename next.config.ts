import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  /* Production configuration */
  reactCompiler: true,

  // Set the workspace root to silence the multiple lockfiles warning
  outputFileTracingRoot: process.cwd(),

  // External packages that should not be bundled (for serverless functions)
  // These packages will be loaded from node_modules at runtime
  // Required for packages with native dependencies or large dependencies
  serverExternalPackages: [
    'pdf-parse', // PDF parsing library with native dependencies
    'mammoth', // DOCX parser
    'xlsx', // Excel parser
    'canvas', // Canvas library (may be used by some dependencies)
  ],

  // Production optimizations
  compress: true,
  poweredByHeader: false,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.amazonaws.com',
      },
    ],
  },

  // Webpack configuration for PDF.js and canvas handling
  webpack: (config, { isServer, webpack }) => {
    // Create a stub module path for canvas
    const canvasStubPath = path.resolve(process.cwd(), 'lib/canvas-stub.js');

    // Apply canvas stub for both client and server builds
    // This prevents pdfjs-dist from trying to require 'canvas' during build
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^canvas$/, canvasStubPath));

    // Use alias to redirect canvas to stub
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: canvasStubPath,
    };

    // Externalize packages with native dependencies for server-side builds
    // These packages should be loaded from node_modules at runtime, not bundled
    // This works together with serverExternalPackages to ensure they're included in deployment
    if (isServer) {
      config.externals = config.externals || [];
      // Ensure externals is an array
      if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = [
          originalExternals,
          {
            'pdf-parse': 'commonjs pdf-parse',
            mammoth: 'commonjs mammoth',
            xlsx: 'commonjs xlsx',
          },
        ];
      } else if (Array.isArray(config.externals)) {
        config.externals.push({
          'pdf-parse': 'commonjs pdf-parse',
          mammoth: 'commonjs mammoth',
          xlsx: 'commonjs xlsx',
        });
      } else {
        config.externals = [
          config.externals,
          {
            'pdf-parse': 'commonjs pdf-parse',
            mammoth: 'commonjs mammoth',
            xlsx: 'commonjs xlsx',
          },
        ];
      }
    }

    // Set fallback for Node.js modules (mainly for client-side)
    if (!isServer) {
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
