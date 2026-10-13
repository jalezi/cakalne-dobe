import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    // A crashed Stryker run can leave a sandbox copy of the tests behind
    exclude: [...configDefaults.exclude, '.stryker-tmp/**'],
    coverage: {
      provider: 'v8',
      // Include untested files so they report 0% instead of being omitted
      include: ['src/**/*.{ts,tsx}'],
      // json writes coverage/coverage-final.json, read by `fallow health`
      reporter: ['text-summary', 'json'],
    },
  },
});
