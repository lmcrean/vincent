import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { apiHandlers } from './api-mocks.js';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp-promise';

// Setup MSW server for API mocking
export const server = setupServer(...apiHandlers);

// Global test directory for temp files
let globalTempDir: string;

beforeAll(async () => {
  // Start MSW server
  server.listen({ onUnhandledRequest: 'error' });
  
  // Create global temp directory for test files
  const tmpDir = await tmp.dir({ prefix: 'vincent-integration-', unsafeCleanup: true });
  globalTempDir = tmpDir.path;
  
  // Set environment variables for tests
  process.env.VINCENT_TEST_TEMP_DIR = globalTempDir;
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Stop MSW server
  server.close();
  
  // Clean up global temp directory
  if (globalTempDir) {
    await fs.remove(globalTempDir).catch(() => {
      // Ignore cleanup errors in tests
    });
  }
});

beforeEach(() => {
  // Reset MSW handlers before each test
  server.resetHandlers();
});

afterEach(() => {
  // Clean up any test-specific state
  delete process.env.GEMINI_API_KEY;
});

// Export utilities for tests
export { globalTempDir };