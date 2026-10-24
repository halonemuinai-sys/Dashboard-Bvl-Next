import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // The server's Docker build skips the slow type check (SKIP_BUILD_TYPECHECK=1 in the Dockerfile);
  // the deploy script runs `tsc --noEmit` and the tests locally first and stops on any error.
  typescript: { ignoreBuildErrors: process.env.SKIP_BUILD_TYPECHECK === '1' },
  // Reuse compiled modules between builds (kept in .next/cache via a Docker cache mount on the server).
  experimental: { turbopackFileSystemCacheForBuild: true },
};

export default nextConfig;
