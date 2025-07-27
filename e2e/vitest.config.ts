import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 30000, // 30 seconds for CLI operations
    hookTimeout: 10000, // 10 seconds for setup/teardown
    environment: 'node',
    globals: false,
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        'fixtures/**',
        'helpers/**'
      ]
    }
  }
})