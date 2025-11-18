import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Set the workspace root to silence the multiple lockfiles warning
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
