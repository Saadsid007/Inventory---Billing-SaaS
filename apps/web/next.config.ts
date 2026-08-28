import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import type { NextConfig } from 'next';

// Spec §2.5: one .env at the repo root, loaded by both apps. Next only looks
// inside the app directory, so pull the root file in before the config is read.
const repoRoot = path.resolve(process.cwd(), '../..');
loadEnv({ path: path.join(repoRoot, '.env'), quiet: true });

const nextConfig: NextConfig = {
  // Workspace packages ship as TypeScript source during Phase 0–1 (spec §2.5),
  // so Next compiles them itself rather than each package carrying a build step.
  transpilePackages: ['@bahikhata/ui', '@bahikhata/core', '@bahikhata/shared', '@bahikhata/db'],

  // Without this, Next infers the wrong root in a pnpm workspace and traces the
  // wrong files into the standalone output.
  outputFileTracingRoot: repoRoot,

  // Browser-visible values must be inlined explicitly, because they were loaded
  // from the root .env after Next had already collected its own env.
  env: {
    NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'] ?? '',
    NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '',
  },

  // Next 16 dropped the built-in `next lint` step, so linting is entirely
  // `pnpm lint` (turbo -> eslint per package). Type errors still fail the build.
  typescript: { ignoreBuildErrors: false },

  images: {
    // Product images are served from the Supabase public bucket.
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/**' }],
    formats: ['image/webp'],
  },
};

export default nextConfig;
