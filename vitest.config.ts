import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Scope ONLY to our project tests — exclude global npm packages
    include: ['src/tests/**/*.test.ts'],
    exclude: ['src/tests/**/*.e2e.ts', 'node_modules/**'],
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
      include: ['src/lib/ai/**'],
      exclude: [
        'node_modules/**',
        'src/tests/**',
        '**/*.e2e.ts',
        'src/app/**',
        'src/components/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
