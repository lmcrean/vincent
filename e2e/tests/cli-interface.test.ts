import { describe, test, expect } from 'vitest'
import { CLIRunner } from '../helpers/cli-runner.js'
import { setupTestSuite } from '../helpers/test-setup.js'
import { copyFixture, FIXTURE_FILES } from '../fixtures/fixture-helpers.js'

describe('CLI Interface Tests - Iteration 1', () => {
  const { getTempDir, cleanup } = setupTestSuite()
  const cli = new CLIRunner()

  describe('Command Line Arguments', () => {
    test('should require deck path when not provided', async () => {
      const result = await cli.run([])
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('required argument \'deck\' not provided')
    }, 10000)

    test('should validate style option values', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      // Test invalid style
      const result = await cli.runNonInteractive([deckPath, '--style', 'invalid-style'])
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('Invalid style \'invalid-style\'')
      expect(result.stderr).toContain('Valid styles are: educational, medical, colorful')
    }, 10000)

    test('should validate concurrency option range', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      // Test concurrency too low
      const result1 = await cli.runNonInteractive([deckPath, '--concurrency', '0'])
      expect(result1.exitCode).toBe(1)
      expect(result1.stderr).toContain('Concurrency must be between 1 and 10')
      
      // Test concurrency too high
      const result2 = await cli.runNonInteractive([deckPath, '--concurrency', '15'])
      expect(result2.exitCode).toBe(1)
      expect(result2.stderr).toContain('Concurrency must be between 1 and 10')
      
      // Test non-numeric concurrency
      const result3 = await cli.runNonInteractive([deckPath, '--concurrency', 'abc'])
      expect(result3.exitCode).toBe(1)
      expect(result3.stderr).toContain('Concurrency must be between 1 and 10')
    }, 15000)

    test('should accept valid concurrency values', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      // Test valid concurrency values
      const validValues = ['1', '3', '5', '10']
      
      for (const value of validValues) {
        const result = await cli.runNonInteractive([deckPath, '--concurrency', value])
        expect(result.exitCode).toBe(0)
      }
    }, 30000)
  })

  describe('File Validation', () => {
    test('should reject non-existent file', async () => {
      const result = await cli.runNonInteractive(['non-existent-file.txt'])
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('File not found')
    }, 10000)

    test('should reject non-txt file extension', async () => {
      const tempDir = getTempDir()
      
      // Create a file with wrong extension
      const { writeFile } = await import('fs-extra')
      const wrongFile = `${tempDir}/test.doc`
      await writeFile(wrongFile, 'test content')
      
      const result = await cli.runNonInteractive([wrongFile])
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('must be a .txt file')
    }, 10000)
  })

  describe('Interactive Mode', () => {
    test('should error when deck path not provided in non-interactive mode', async () => {
      // In test mode (NODE_ENV=test), the CLI runs in non-interactive mode
      // and should error if no deck path is provided
      const result = await cli.run([])
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain("error: required argument 'deck' not provided")
    }, 10000)

    test('should prompt for API key on first run', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      // Run with fresh environment (no stored API key)
      const result = await cli.runInteractive([deckPath], ['y', 'test-api-key'], {
        env: {
          NODE_ENV: 'test',
          CI: 'true',
          GEMINI_API_KEY: '' // Ensure no API key is set
        }
      })
      
      expect(result.stdout).toContain('First-time setup required')
      expect(result.stdout).toContain('Enter your Gemini API key')
    }, 30000)

    test('should use default style in non-interactive mode', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      // In non-interactive mode, it should use default style
      const result = await cli.runNonInteractive([deckPath])
      
      expect(result.exitCode).toBe(0)
      // Should show MOCK MODE ACTIVATED since we're using mock API key
      expect(result.stdout).toContain('MOCK MODE ACTIVATED')
    }, 45000)

    test('should not show configuration summary in non-interactive mode', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      // In non-interactive mode, configuration summary is not shown
      const result = await cli.runNonInteractive([deckPath])
      
      expect(result.exitCode).toBe(0)
      // Configuration summary is only shown in interactive mode
      expect(result.stdout).not.toContain('📋 Configuration:')
      expect(result.stdout).toContain('MOCK MODE ACTIVATED')
    }, 45000)

    test('should not prompt for confirmation in non-interactive mode', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      // In non-interactive mode, no confirmation prompt
      const result = await cli.runNonInteractive([deckPath])
      
      expect(result.exitCode).toBe(0)
      // Should proceed without asking for confirmation
      expect(result.stdout).not.toContain('Generate images for all cards?')
      expect(result.stdout).toContain('MOCK MODE ACTIVATED')
    }, 45000)
  })

  describe('Environment Variables', () => {
    test('should use GEMINI_API_KEY from environment', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      const result = await cli.runNonInteractive([deckPath], {
        env: {
          NODE_ENV: 'test',
          CI: 'true',
          GEMINI_API_KEY: 'env-api-key'
        }
      })
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).not.toContain('Enter your Gemini API key')
    }, 30000)

    test('should handle missing API key in non-interactive mode', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      // Use the base run method to avoid automatic API key setting
      const result = await cli.run([deckPath], {
        env: {
          NODE_ENV: 'test',
          CI: 'true',
          // Don't set GEMINI_API_KEY at all
        }
      })
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('API key is required')
    }, 10000)
  })

  describe('Dry Run Mode', () => {
    test('should accept dry-run flag but not implement it yet', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      // Dry-run flag is accepted but functionality not implemented in v1
      const result = await cli.runNonInteractive([deckPath, '--dry-run'])
      
      expect(result.exitCode).toBe(0)
      // Currently dry-run doesn't change behavior - this is expected for v1
      expect(result.stdout).toContain('MOCK MODE ACTIVATED')
    }, 45000)
  })
})