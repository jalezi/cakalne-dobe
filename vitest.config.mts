import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [react()],
  test: {
    globals: true,
    // A crashed Stryker run can leave a sandbox copy of the tests behind
    // Orchestrator sessions park draft tests in .temp/, a local scratch folder
    exclude: [...configDefaults.exclude, '.stryker-tmp/**', '.temp/**'],
    coverage: {
      provider: 'v8',
      // Include untested files so they report 0% instead of being omitted
      include: ['src/**/*.{ts,tsx}', 'seed/**/*.ts', 'scripts/**/*.ts'],
      // json writes coverage/coverage-final.json, read by `fallow health`; json-summary feeds the CI coverage table
      reporter: ['text-summary', 'json', 'json-summary'],
      // Floors to raise over time, not targets
      thresholds: { statements: 83, branches: 78, functions: 78, lines: 83 },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          exclude: ['**/*.test.tsx'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          // A component test must be named *.test.tsx to run here
          include: ['**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['./test/setup.ts'],
        },
      },
    ],
  },
});
