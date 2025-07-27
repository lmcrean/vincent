import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { spawn } from 'child_process';
import { createTestApkg, createTestOutputDir } from '../helpers/file-fixtures.js';
import { sampleCards, testEnv } from '../helpers/test-data.js';

describe('CLI Integration Tests', () => {
  let outputDir: string;
  let testApkgPath: string;

  beforeEach(async () => {
    outputDir = await createTestOutputDir();
    
    // Create test .apkg file
    testApkgPath = await createTestApkg({
      deckName: 'CLI Test Deck',
      cards: sampleCards.single
    });

    // Set test environment
    process.env.GEMINI_API_KEY = testEnv.validApiKey;
  });

  afterEach(async () => {
    await fs.remove(outputDir).catch(() => {});
    delete process.env.GEMINI_API_KEY;
  });

  describe('argument parsing', () => {
    it('should display help when --help flag is used', async () => {
      const { stdout, stderr, exitCode } = await runCLI(['--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Usage:');
      expect(stdout).toContain('vincent');
      expect(stdout).toContain('Options:');
      expect(stderr).toBe('');
    });

    it('should display version when --version flag is used', async () => {
      const { stdout, stderr, exitCode } = await runCLI(['--version']);

      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/\d+\.\d+\.\d+/); // Should match version pattern
      expect(stderr).toBe('');
    });

    it('should show error for missing input file', async () => {
      const { stdout, stderr, exitCode } = await runCLI([]);

      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('error');
      expect(stderr.toLowerCase()).toContain('required');
    });

    it('should show error for non-existent input file', async () => {
      const nonExistentFile = path.join(outputDir, 'does-not-exist.apkg');
      const { stdout, stderr, exitCode } = await runCLI([nonExistentFile]);

      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('Could not find file');
    });

    it('should show error for invalid file extension', async () => {
      const invalidFile = path.join(outputDir, 'test.txt');
      await fs.writeFile(invalidFile, 'test content');
      
      const { stdout, stderr, exitCode } = await runCLI([invalidFile]);

      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('not a valid Anki deck (.apkg)');
    });
  });

  describe('option handling', () => {
    it('should handle --output option correctly', async () => {
      const customOutput = path.join(outputDir, 'custom-output.apkg');
      const { stdout, stderr, exitCode } = await runCLI([
        testApkgPath,
        '--output', customOutput,
        '--dry-run'
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('custom-output.apkg');
    });

    it('should handle --style option correctly', async () => {
      const styles = ['educational', 'medical', 'colorful', 'minimal'];

      for (const style of styles) {
        const { stdout, stderr, exitCode } = await runCLI([
          testApkgPath,
          '--style', style,
          '--dry-run'
        ]);

        expect(exitCode).toBe(0);
        expect(stdout.toLowerCase()).toContain(style);
      }
    });

    it('should reject invalid style option', async () => {
      const { stdout, stderr, exitCode } = await runCLI([
        testApkgPath,
        '--style', 'invalid-style',
        '--dry-run'
      ]);

      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('invalid choice');
    });

    it('should handle --concurrency option correctly', async () => {
      const { stdout, stderr, exitCode } = await runCLI([
        testApkgPath,
        '--concurrency', '3',
        '--dry-run'
      ]);

      expect(exitCode).toBe(0);
    });

    it('should reject invalid concurrency values', async () => {
      const invalidValues = ['0', '-1', 'abc', '11'];

      for (const value of invalidValues) {
        const { stdout, stderr, exitCode } = await runCLI([
          testApkgPath,
          '--concurrency', value,
          '--dry-run'
        ]);

        expect(exitCode).not.toBe(0);
        expect(stderr).toContain('must be between 1 and 10');
      }
    });

    it('should handle --verbose flag', async () => {
      const { stdout, stderr, exitCode } = await runCLI([
        testApkgPath,
        '--verbose',
        '--dry-run'
      ]);

      expect(exitCode).toBe(0);
      // Verbose mode should show more detailed output
      expect(stdout.length).toBeGreaterThan(0);
    });
  });

  describe('dry run mode', () => {
    it('should show deck analysis in dry run mode', async () => {
      const { stdout, stderr, exitCode } = await runCLI([
        testApkgPath,
        '--dry-run'
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Dry Run Summary');
      expect(stdout).toContain('CLI Test Deck');
      expect(stdout).toContain('Cards: 1');
      expect(stdout).toContain('What is 2 + 2?');
    });

    it('should not generate any files in dry run mode', async () => {
      const outputFile = path.join(outputDir, 'test-output.apkg');
      
      const { stdout, stderr, exitCode } = await runCLI([
        testApkgPath,
        '--output', outputFile,
        '--dry-run'
      ]);

      expect(exitCode).toBe(0);
      expect(await fs.pathExists(outputFile)).toBe(false);
    });

    it('should show sample cards in dry run mode', async () => {
      // Create deck with multiple cards
      const multiCardApkg = await createTestApkg({
        deckName: 'Multi Card Test',
        cards: sampleCards.vocabulary
      });

      const { stdout, stderr, exitCode } = await runCLI([
        multiCardApkg,
        '--dry-run'
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Sample cards:');
      expect(stdout).toContain('What is the capital of France?');
    });
  });

  describe('API key handling', () => {
    it('should prompt for API key when not provided', async () => {
      delete process.env.GEMINI_API_KEY;
      
      const { stdout, stderr, exitCode } = await runCLI([
        testApkgPath,
        '--dry-run'
      ], { timeout: 5000 });

      // Should either succeed with prompt or fail with clear message
      if (exitCode !== 0) {
        expect(stderr).toContain('API key');
      } else {
        expect(stdout).toContain('API key');
      }
    });

    it('should use API key from environment variable', async () => {
      process.env.GEMINI_API_KEY = testEnv.validApiKey;
      
      const { stdout, stderr, exitCode } = await runCLI([
        testApkgPath,
        '--dry-run'
      ]);

      expect(exitCode).toBe(0);
      // Should not prompt for API key
      expect(stdout).not.toContain('Enter your Gemini API key');
    });

    it('should handle invalid API key gracefully', async () => {
      process.env.GEMINI_API_KEY = testEnv.invalidApiKey;
      
      const { stdout, stderr, exitCode } = await runCLI([
        testApkgPath,
        '--dry-run'
      ]);

      // Dry run should still work with invalid key
      expect(exitCode).toBe(0);
    });
  });

  describe('output formatting', () => {
    it('should show progress information', async () => {
      const { stdout, stderr, exitCode } = await runCLI([
        testApkgPath,
        '--dry-run'
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Estimated time:');
      expect(stdout).toMatch(/\d+.*minutes?/);
    });

    it('should show deck statistics', async () => {
      const { stdout, stderr, exitCode } = await runCLI([
        testApkgPath,
        '--dry-run'
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Cards: 1');
      expect(stdout).toContain('Style:');
    });

    it('should format output nicely', async () => {
      const { stdout, stderr, exitCode } = await runCLI([
        testApkgPath,
        '--dry-run'
      ]);

      expect(exitCode).toBe(0);
      // Should contain box drawing or formatting characters
      expect(stdout).toMatch(/[📋📁⏱️💰📊]/); // Various emoji indicators
    });
  });

  describe('error handling', () => {
    it('should handle corrupted .apkg files gracefully', async () => {
      const corruptedFile = path.join(outputDir, 'corrupted.apkg');
      await fs.writeFile(corruptedFile, 'not a valid zip file');
      
      const { stdout, stderr, exitCode } = await runCLI([corruptedFile]);

      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('Failed to parse .apkg file');
      expect(stderr).toContain('.apkg');
    });

    it('should handle permission errors', async () => {
      // Create a directory where output file should go, making it read-only
      const readOnlyDir = path.join(outputDir, 'readonly');
      await fs.ensureDir(readOnlyDir);
      
      try {
        await fs.chmod(readOnlyDir, 0o444);
        
        const outputFile = path.join(readOnlyDir, 'output.apkg');
        const { stdout, stderr, exitCode } = await runCLI([
          testApkgPath,
          '--output', outputFile,
          '--dry-run'
        ]);

        // Dry run shouldn't fail due to permissions
        expect(exitCode).toBe(0);
        
      } finally {
        // Restore permissions for cleanup
        try {
          await fs.chmod(readOnlyDir, 0o755);
        } catch {}
      }
    });

    it('should show user-friendly error messages', async () => {
      const { stdout, stderr, exitCode } = await runCLI(['invalid-file.apkg']);

      expect(exitCode).not.toBe(0);
      expect(stderr).not.toContain('stack trace');
      expect(stderr).not.toContain('Error:');
      // Should be a clean, user-friendly message
      expect(stderr.length).toBeLessThan(200);
    });
  });
});

/**
 * Helper function to run CLI command and capture output
 */
async function runCLI(args: string[], options: { timeout?: number } = {}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout || 10000;
    
    // Build path to CLI script - relative to the integration test directory
    const cliPath = path.resolve(process.cwd(), '..', 'dist', 'cli.js');
    
    const child = spawn('node', [cliPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`CLI command timed out after ${timeout}ms`));
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code || 0
      });
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    // Close stdin to prevent hanging
    child.stdin?.end();
  });
}