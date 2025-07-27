import { vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { tmpdir } from 'os';

export const mockApiKey = 'test-api-key-123';

export const createTempDir = async (): Promise<string> => {
  const tempDir = path.join(tmpdir(), 'vincent-test-' + Date.now());
  await fs.ensureDir(tempDir);
  return tempDir;
};

export const cleanupTempDir = async (dir: string): Promise<void> => {
  try {
    await fs.remove(dir);
  } catch (error) {
    // Ignore cleanup errors in tests
  }
};

export const createMockAnkiFile = async (dir: string, fileName: string = 'test.txt'): Promise<string> => {
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, Buffer.from('mock-anki-data'));
  return filePath;
};

export const mockConsole = () => {
  const originalConsole = { ...console };
  const consoleMock = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  };
  
  Object.assign(console, consoleMock);
  
  return {
    consoleMock,
    restore: () => Object.assign(console, originalConsole),
  };
};

export const mockAxios = () => {
  return vi.hoisted(() => ({
    post: vi.fn(),
    get: vi.fn(),
    defaults: {
      headers: {
        common: {}
      }
    }
  }));
};

export const createMockAnkiCard = (overrides = {}) => ({
  id: 1,
  nid: 1,
  question: 'What is photosynthesis?',
  answer: 'The process by which plants convert light into energy',
  fields: ['What is photosynthesis?', 'The process by which plants convert light into energy'],
  tags: ['biology', 'plants'],
  ...overrides
});

export const createMockLogger = () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
});