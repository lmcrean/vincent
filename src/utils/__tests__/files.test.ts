import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { tmpdir } from 'os';
import { 
  ensureDir, 
  fileExists, 
  validateApkgFile, 
  generateOutputFilename, 
  createTempDir 
} from '../files.js';
import { FileError } from '../errors.js';

describe('ensureDir', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(tmpdir(), 'vincent-test-' + Date.now());
  });

  afterEach(async () => {
    try {
      await fs.remove(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should create directory successfully', async () => {
    await ensureDir(tempDir);
    
    const exists = await fs.pathExists(tempDir);
    expect(exists).toBe(true);
  });

  it('should not throw error if directory already exists', async () => {
    await fs.ensureDir(tempDir);
    
    await expect(ensureDir(tempDir)).resolves.not.toThrow();
  });

  it('should throw FileError on permission error', async () => {
    const invalidPath = '/invalid/permission/path';
    
    await expect(ensureDir(invalidPath)).rejects.toThrow(FileError);
    await expect(ensureDir(invalidPath)).rejects.toThrow('Failed to create directory');
  });
});

describe('fileExists', () => {
  let tempFile: string;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(tmpdir(), 'vincent-test-' + Date.now());
    await fs.ensureDir(tempDir);
    tempFile = path.join(tempDir, 'test.txt');
  });

  afterEach(async () => {
    try {
      await fs.remove(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should return true for existing file', async () => {
    await fs.writeFile(tempFile, 'test content');
    
    const exists = await fileExists(tempFile);
    expect(exists).toBe(true);
  });

  it('should return false for non-existing file', async () => {
    const exists = await fileExists(path.join(tempDir, 'nonexistent.txt'));
    expect(exists).toBe(false);
  });

  it('should return true for existing directory', async () => {
    const exists = await fileExists(tempDir);
    expect(exists).toBe(true);
  });
});

describe('validateApkgFile', () => {
  let tempDir: string;
  let validApkgFile: string;

  beforeEach(async () => {
    tempDir = path.join(tmpdir(), 'vincent-test-' + Date.now());
    await fs.ensureDir(tempDir);
    validApkgFile = path.join(tempDir, 'test.apkg');
    await fs.writeFile(validApkgFile, 'mock anki data');
  });

  afterEach(async () => {
    try {
      await fs.remove(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should pass validation for valid .apkg file', () => {
    expect(() => validateApkgFile(validApkgFile)).not.toThrow();
  });

  it('should throw FileError for non-.apkg file', () => {
    const txtFile = path.join(tempDir, 'test.txt');
    
    expect(() => validateApkgFile(txtFile)).toThrow(FileError);
    expect(() => validateApkgFile(txtFile)).toThrow('not a valid Anki deck');
  });

  it('should throw FileError for non-existing .apkg file', () => {
    const nonExistentFile = path.join(tempDir, 'nonexistent.apkg');
    
    expect(() => validateApkgFile(nonExistentFile)).toThrow(FileError);
    expect(() => validateApkgFile(nonExistentFile)).toThrow('Could not find file');
  });

  it('should throw FileError for file without extension', () => {
    const noExtFile = path.join(tempDir, 'test');
    
    expect(() => validateApkgFile(noExtFile)).toThrow(FileError);
    expect(() => validateApkgFile(noExtFile)).toThrow('not a valid Anki deck');
  });
});

describe('generateOutputFilename', () => {
  it('should generate output filename with default suffix', () => {
    const inputPath = '/path/to/my-deck.apkg';
    const result = generateOutputFilename(inputPath);
    
    expect(result).toBe('/path/to/my-deck-illustrated.apkg');
  });

  it('should generate output filename with custom suffix', () => {
    const inputPath = '/path/to/my-deck.apkg';
    const result = generateOutputFilename(inputPath, 'enhanced');
    
    expect(result).toBe('/path/to/my-deck-enhanced.apkg');
  });

  it('should handle windows paths', () => {
    const inputPath = 'C:\\Users\\Documents\\my-deck.apkg';
    const result = generateOutputFilename(inputPath, 'images');
    
    expect(result).toBe(path.join('C:\\Users\\Documents', 'my-deck-images.apkg'));
  });

  it('should handle paths with multiple dots', () => {
    const inputPath = '/path/to/my.test.deck.apkg';
    const result = generateOutputFilename(inputPath);
    
    expect(result).toBe('/path/to/my.test.deck-illustrated.apkg');
  });

  it('should handle relative paths', () => {
    const inputPath = './my-deck.apkg';
    const result = generateOutputFilename(inputPath);
    
    expect(result).toBe('./my-deck-illustrated.apkg');
  });
});

describe('createTempDir', () => {
  let createdDirs: string[] = [];

  afterEach(async () => {
    // Clean up all created directories
    for (const dir of createdDirs) {
      try {
        await fs.remove(dir);
      } catch {
        // Ignore cleanup errors
      }
    }
    createdDirs = [];
  });

  it('should create temporary directory', async () => {
    const tempDir = await createTempDir();
    createdDirs.push(tempDir);
    
    expect(tempDir).toMatch(/tmp-vincent-\d+/);
    
    const exists = await fs.pathExists(tempDir);
    expect(exists).toBe(true);
  });

  it('should create unique directory names', async () => {
    const tempDir1 = await createTempDir();
    const tempDir2 = await createTempDir();
    
    createdDirs.push(tempDir1, tempDir2);
    
    expect(tempDir1).not.toBe(tempDir2);
    
    const exists1 = await fs.pathExists(tempDir1);
    const exists2 = await fs.pathExists(tempDir2);
    
    expect(exists1).toBe(true);
    expect(exists2).toBe(true);
  });

  it('should create directory in current working directory', async () => {
    const tempDir = await createTempDir();
    createdDirs.push(tempDir);
    
    const cwd = process.cwd();
    expect(tempDir).toMatch(new RegExp(`^${cwd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });
});