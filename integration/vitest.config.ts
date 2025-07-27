import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'fixtures'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'fixtures/**',
        '**/*.d.ts',
        'helpers/**',
        'vitest.config.ts'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    setupFiles: ['./helpers/test-setup.ts'],
    testTimeout: 30000, // Longer timeout for integration tests
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@fixtures': path.resolve(__dirname, './fixtures')
    }
  }
});