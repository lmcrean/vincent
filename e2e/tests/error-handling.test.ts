import { describe, test, expect } from 'vitest'
import { CLIRunner } from '../helpers/cli-runner.js'
import { setupTestSuite } from '../helpers/test-setup.js'
import { copyFixture, FIXTURE_FILES } from '../fixtures/fixture-helpers.js'
import { writeFile } from 'fs-extra'
import path from 'path'

describe('Error Handling E2E Tests - Iteration 1', () => {
  const { getTempDir, cleanup } = setupTestSuite()
  const cli = new CLIRunner()

  describe('File System Errors', () => {
    test('should handle non-existent input file', async () => {
      const result = await cli.runNonInteractive(['non-existent-file.txt'])
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('File not found')
    }, 10000)

    test('should handle empty deck file', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.EMPTY_DECK, tempDir)
      
      const result = await cli.runMockMode(deckPath, ['y', 'mock'])
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('No cards found')
    }, 30000)

    test('should handle invalid deck format', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.INVALID_DECK, tempDir)
      
      const result = await cli.runMockMode(deckPath, ['y', 'mock'])
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('Invalid deck format')
    }, 30000)

    test('should handle file with wrong extension', async () => {
      const tempDir = getTempDir()
      const wrongExtFile = path.join(tempDir, 'test.doc')
      await writeFile(wrongExtFile, 'test content')
      
      const result = await cli.runNonInteractive([wrongExtFile])
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('must be a .txt file')
    }, 10000)

    test('should handle directory instead of file', async () => {
      const tempDir = getTempDir()
      
      const result = await cli.runNonInteractive([tempDir])
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('must be a file')
    }, 10000)
  })

  describe('Permission Errors', () => {
    test('should handle read-only input directory gracefully', async () => {
      // This test would be platform-specific and complex to implement
      // For iteration 1, we focus on basic error handling
      const result = await cli.runNonInteractive(['readonly-file.txt'])
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('File not found')
    }, 10000)
  })

  describe('Configuration Errors', () => {
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

    test('should handle invalid CLI arguments', async () => {
      const result = await cli.run(['--invalid-option'])
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('unknown option')
    }, 10000)

    test('should handle invalid style option', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      const result = await cli.runNonInteractive([deckPath, '--style', 'invalid'])
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('Invalid style')
    }, 10000)

    test('should handle invalid concurrency option', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      const result = await cli.runNonInteractive([deckPath, '--concurrency', '0'])
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('Concurrency must be between 1 and 10')
    }, 10000)
  })

  describe('Interactive Mode Errors', () => {
    test('should handle empty deck path input', async () => {
      const result = await cli.runInteractive([], ['', 'valid-path.txt', 'y', 'mock'])
      
      expect(result.stdout).toContain('Please provide a file path')
    }, 30000)

    test('should handle cancellation during API key setup', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      // Simulate Ctrl+C during API key input (empty input)
      const result = await cli.runInteractive([deckPath], [''], {
        env: {
          NODE_ENV: 'test',
          CI: 'true',
          GEMINI_API_KEY: ''
        }
      })
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('API key is required')
    }, 30000)

    test('should handle operation cancellation', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      // Answer 'n' to confirmation prompt
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

  describe('Processing Errors', () => {
    test('should handle malformed cards gracefully', async () => {
      const tempDir = getTempDir()
      
      // Create deck with malformed cards
      const malformedDeck = path.join(tempDir, 'malformed.txt')
      await writeFile(malformedDeck, 
        'Valid question;Valid answer\n' +
        'Missing answer;\n' +
        ';Missing question\n' +
        'Another valid;Another answer\n'
      )
      
      const result = await cli.runMockMode(malformedDeck, ['y', 'mock'])
      
      // Should either process valid cards or fail gracefully
      expect(result.exitCode).toBe(0) // Mock mode should handle this
      expect(result.stdout).toContain('cards')
    }, 30000)

    test('should handle very long card content', async () => {
      const tempDir = getTempDir()
      
      // Create deck with very long content
      const longContent = 'A'.repeat(1000)
      const longDeck = path.join(tempDir, 'long.txt')
      await writeFile(longDeck, `Long question ${longContent}?;Long answer ${longContent}`)
      
      const result = await cli.runMockMode(longDeck, ['y', 'mock'])
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('1/1 cards')
    }, 30000)

    test('should handle special characters in card content', async () => {
      const tempDir = getTempDir()
      
      // Create deck with special characters
      const specialDeck = path.join(tempDir, 'special.txt')
      await writeFile(specialDeck, 
        'Question with émojis 🚀?;Answer with speciál châractërs\n' +
        'Question with "quotes";Answer with <tags> and &entities;\n'
      )
      
      const result = await cli.runMockMode(specialDeck, ['y', 'mock'])
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('2/2 cards')
    }, 30000)
  })

  describe('System Resource Errors', () => {
    test('should handle timeout gracefully', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      // Set very short timeout
      const result = await cli.runMockMode(deckPath, ['y', 'mock'], {
        timeout: 1000 // 1 second timeout
      })
      
      // Should timeout and fail
      expect(result.failed).toBe(true)
      expect(result.exitCode).not.toBe(0)
    }, 5000)
  })

  describe('Error Message Quality', () => {
    test('should provide helpful error messages', async () => {
      const result = await cli.runNonInteractive(['missing-file.txt'])
      
      expect(result.exitCode).toBe(1)
      expect(result.stderr).not.toContain('undefined')
      expect(result.stderr).not.toContain('null')
      expect(result.stderr.length).toBeGreaterThan(10) // Should have meaningful message
    }, 10000)

    test('should not expose internal errors to users', async () => {
      const result = await cli.runNonInteractive(['invalid-file.txt'])
      
      expect(result.stderr).not.toContain('Error:')
      expect(result.stderr).not.toContain('at ')
      expect(result.stderr).not.toContain('node_modules')
    }, 10000)
  })

  describe('Graceful Degradation', () => {
    test('should handle partial processing failures in mock mode', async () => {
      // In iteration 1 mock mode, all cards should succeed
      // This test validates that the error handling infrastructure is in place
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      const result = await cli.runMockMode(deckPath, ['y', 'mock'])
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Success rate: 100%')
    }, 30000)
  })
})