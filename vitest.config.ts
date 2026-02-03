/// <reference types="vitest" />
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/tests/e2e/**',
      '**/*.e2e.*',
      '**/playwright/**',
      'App.integration.test.tsx',
      // Exclude memory-intensive tests that require special handling
      '**/tests/invariant-fuzz/invariantFuzzTestSuite.test.ts',
      'tests/invariant-fuzz/simulationInvariantChecker.test.ts',
      'src/services/__tests__/dataService.performance.test.ts',
      'src/contracts/__tests__/PerformanceBenchmarks.test.ts',
      'tests/ui-ux/comprehensive-ui-tests.test.tsx'
    ],
    testTimeout: 15000,
    hookTimeout: 7000,
    teardownTimeout: 5000,
    pool: 'threads',
    isolate: true,
    bail: 1,
    restoreMocks: true,
    clearMocks: true
  },
})
