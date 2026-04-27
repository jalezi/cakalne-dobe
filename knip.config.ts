import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  $schema: 'https://unpkg.com/knip@latest/schema.json',
  entry: [
    // Vitest config — listed as entry for static import analysis; loading is
    // disabled below because @vitejs/plugin-react v6 + vite 7 breaks knip's
    // config loader (vite/internal subpath removed). Official workaround:
    // https://knip.dev/reference/known-issues#exceptions-from-config-files
    'vitest.config.mts',
    // Database / seed scripts (run directly via node)
    'drizzle/config/*.ts',
    'seed/**/*.ts',
    'scripts/**/*.ts',
    // Tests (run directly by vitest)
    'test/**/*.ts',
    'src/**/*.test.{ts,tsx}',
    'test/setup.ts',
  ],
  project: [
    'src/**/*.{ts,tsx}',
    'seed/**/*.ts',
    'scripts/**/*.ts',
    'test/**/*.ts',
  ],
  // Prevent knip from executing vitest.config.mts; see entry comment above.
  vitest: {
    config: [],
  },
  ignoreDependencies: [
    // CSS import in src/app/globals.css; knip does not account for stylesheet imports
    'tw-animate-css',
    // tailwindcss itself is a peer dep of @tailwindcss/postcss, not imported
    'tailwindcss',
    // Peer-dep shim pinned via pnpm overrides, not imported directly
    'parse5',
    // shadcn/ui is a peer dep of @shadcn/ui, not imported directly
    'shadcn',
  ],
  ignoreBinaries: [
    // turso CLI — invoked in package.json scripts, not a Node package
    'turso',
  ],
  ignoreExportsUsedInFile: true,
  ignore: [
    // shadcn/ui components — exports are part of the public component API,
    // not all are consumed internally
    'src/components/ui/**',
  ],
};

export default config;
