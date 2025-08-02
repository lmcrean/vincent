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

    test('should show style selection prompt', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      // Test interactive style selection
      const result = await cli.runInteractive([deckPath], ['y', 'mock', '0']) // Select first option
      
      expect(result.stdout).toContain('Choose image style')
      expect(result.stdout).toContain('Educational - Clean diagrams')
      expect(result.stdout).toContain('Medical - Anatomical')
      expect(result.stdout).toContain('Colorful - Memorable')
    }, 30000)

    test('should show configuration summary', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      const result = await cli.runMockMode(deckPath)
      
      expect(result.stdout).toContain('Configuration:')
      expect(result.stdout).toContain('Input:')
      expect(result.stdout).toContain('Output:')
      expect(result.stdout).toContain('Style:')
    }, 30000)

    test('should allow cancellation during confirmation', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      // Answer 'n' to the confirmation prompt
      const result = await cli.runInteractive([deckPath], ['n'], {
        env: {
          NODE_ENV: 'test',
          CI: 'true',
          GEMINI_API_KEY: 'test-key'
        }
      })
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Operation cancelled')
    }, 30000)
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
      
      const result = await cli.runNonInteractive([deckPath], {
        env: {
          NODE_ENV: 'test',
          CI: 'true',
          GEMINI_API_KEY: '' // No API key
        }
      })
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('GEMINI_API_KEY environment variable is required')
    }, 10000)
  })

  describe('Dry Run Mode', () => {
    test('should show what would be done without generating images', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      const result = await cli.runNonInteractive([deckPath, '--dry-run'])
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('DRY RUN')
      expect(result.stdout).toContain('cards would be processed')
      
      // Should not create actual output files in dry run
      const { pathExists } = await import('fs-extra')
      const outputExists = await pathExists(`${tempDir}/sample-deck-illustrated.txt`)
      expect(outputExists).toBe(false)
    }, 30000)
  })
})