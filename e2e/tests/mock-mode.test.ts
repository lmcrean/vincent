import { describe, test, expect } from 'vitest'
import { CLIRunner } from '../helpers/cli-runner.js'
import { setupTestSuite } from '../helpers/test-setup.js'
import { copyFixture, FIXTURE_FILES, getExpectedOutputName } from '../fixtures/fixture-helpers.js'
import { pathExists, readFile, readdir } from 'fs-extra'
import path from 'path'

describe('Mock Mode E2E Tests - Iteration 1', () => {
  const { getTempDir, cleanup } = setupTestSuite()
  const cli = new CLIRunner()

  describe('Mock Mode Activation', () => {
    test('should activate mock mode with "mock" API key', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      const result = await cli.runMockMode(deckPath, ['y', 'mock'])
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('MOCK MODE ACTIVATED')
      expect(result.stdout).toContain('Using placeholder images for testing')
      expect(result.stdout).toContain('No external API calls will be made')
    }, 30000)

    test('should work with environment variable in mock mode', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      const result = await cli.runNonInteractive([deckPath], {
        env: {
          NODE_ENV: 'test',
          CI: 'true',
          GEMINI_API_KEY: 'mock'
        }
      })
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('MOCK MODE ACTIVATED')
    }, 30000)
  })

  describe('Mock Processing Behavior', () => {
    test('should simulate realistic processing times', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      const startTime = Date.now()
      const result = await cli.runMockMode(deckPath, ['y', 'mock'])
      const duration = Date.now() - startTime
      
      expect(result.exitCode).toBe(0)
      
      // Should take some time to simulate real processing (but not too long)
      expect(duration).toBeGreaterThan(5000) // At least 5 seconds for 6 cards
      expect(duration).toBeLessThan(20000) // But less than 20 seconds
    }, 25000)

    test('should show progress for each card', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      const result = await cli.runMockMode(deckPath, ['y', 'mock'])
      
      expect(result.exitCode).toBe(0)
      
      // Should show processing progress for each card
      expect(result.stdout).toContain('Processing: Card 1/6')
      expect(result.stdout).toContain('Processing: Card 2/6')
      expect(result.stdout).toContain('Processing: Card 6/6')
      
      // Should show generated image names
      expect(result.stdout).toMatch(/Image generated: card-\d{3}\.png/)
    }, 30000)

    test('should create mock image files', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      const result = await cli.runMockMode(deckPath, ['y', 'mock'])
      
      expect(result.exitCode).toBe(0)
      
      // Should create PNG files
      const files = await readdir(tempDir)
      const pngFiles = files.filter(file => file.endsWith('.png'))
      
      expect(pngFiles.length).toBe(6) // One for each card
      
      // Each PNG file should exist and have content
      for (const pngFile of pngFiles) {
        const filePath = path.join(tempDir, pngFile)
        expect(await pathExists(filePath)).toBe(true)
        
        // Should be a valid image file (check file size > 0)
        const { stat } = await import('fs-extra')
        const stats = await stat(filePath)
        expect(stats.size).toBeGreaterThan(0)
      }
    }, 30000)

    test('should generate enhanced deck file with image references', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      const result = await cli.runMockMode(deckPath, ['y', 'mock'])
      
      expect(result.exitCode).toBe(0)
      
      // Should create enhanced deck file
      const outputPath = path.join(tempDir, getExpectedOutputName(FIXTURE_FILES.SAMPLE_DECK))
      expect(await pathExists(outputPath)).toBe(true)
      
      const outputContent = await readFile(outputPath, 'utf8')
      const lines = outputContent.trim().split('\n')
      
      // Should have same number of lines as input
      expect(lines.length).toBe(6)
      
      // Each line should contain original content plus image reference
      for (const line of lines) {
        expect(line).toContain(';') // Should have Q;A format
        expect(line).toContain('<img src=') // Should have image reference
        expect(line).toMatch(/<img src='[^']+\.png'>/) // Should have proper image tag
      }
    }, 30000)
  })

  describe('Mock Mode Output Validation', () => {
    test('should preserve original card content exactly', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      const originalContent = await readFile(deckPath, 'utf8')
      const originalLines = originalContent.trim().split('\n')
      
      const result = await cli.runMockMode(deckPath, ['y', 'mock'])
      expect(result.exitCode).toBe(0)
      
      // Output file is created in the same directory as the input file
      const inputDir = path.dirname(deckPath)
      const outputPath = path.join(inputDir, getExpectedOutputName(FIXTURE_FILES.SAMPLE_DECK))
      const outputContent = await readFile(outputPath, 'utf8')
      const outputLines = outputContent.trim().split('\n')
      
      // Check each line preserves original Q&A
      for (let i = 0; i < originalLines.length; i++) {
        const [originalQ, originalA] = originalLines[i].split(';')
        const outputLine = outputLines[i]
        
        // Enhanced format: question;answer;<img src='image.png'>
        const outputParts = outputLine.split(';')
        expect(outputParts.length).toBeGreaterThanOrEqual(3) // Should have Q, A, and image
        
        expect(outputParts[0].trim()).toBe(originalQ.trim()) // Question should match (trimmed)
        expect(outputParts[1].trim()).toBe(originalA.trim()) // Answer should match (trimmed)
        expect(outputParts[2]).toContain('<img src=') // Should have image tag
      }
    }, 30000)

    test('should generate unique image names', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      const result = await cli.runMockMode(deckPath, ['y', 'mock'])
      expect(result.exitCode).toBe(0)
      
      const files = await readdir(tempDir)
      const pngFiles = files.filter(file => file.endsWith('.png'))
      
      // All image names should be unique
      const uniqueNames = new Set(pngFiles)
      expect(uniqueNames.size).toBe(pngFiles.length)
      
      // Image names should follow expected pattern: card-001.png, card-002.png, etc.
      for (const pngFile of pngFiles) {
        expect(pngFile).toMatch(/^card-\d{3}\.png$/)
      }
    }, 30000)

    test('should show completion summary', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      const result = await cli.runMockMode(deckPath, ['y', 'mock'])
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('✅ Complete! 6/6 images generated successfully.')
      expect(result.stdout).toContain('📁 Created files:')
      expect(result.stdout).toContain('📊 Success rate: 100%')
      expect(result.stdout).toContain('sample-deck-illustrated.txt')
    }, 30000)
  })

  describe('Mock Mode with Different Deck Sizes', () => {
    test('should handle large deck in mock mode', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.LARGE_DECK, tempDir)
      
      const result = await cli.runMockMode(deckPath, ['y', 'mock'])
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('15') // Should show correct card count
      
      // Should create all expected files
      const files = await readdir(tempDir)
      const pngFiles = files.filter(file => file.endsWith('.png'))
      expect(pngFiles.length).toBe(15)
      
      // Enhanced deck should have all cards
      const outputPath = path.join(tempDir, getExpectedOutputName(FIXTURE_FILES.LARGE_DECK))
      const outputContent = await readFile(outputPath, 'utf8')
      const outputLines = outputContent.trim().split('\n')
      expect(outputLines.length).toBe(15)
    }, 45000)

    test('should handle single card deck', async () => {
      const tempDir = getTempDir()
      
      // Create single card deck
      const { writeFile } = await import('fs-extra')
      const singleCardPath = path.join(tempDir, 'single-card.txt')
      await writeFile(singleCardPath, 'What is AI?;Artificial Intelligence')
      
      const result = await cli.runMockMode(singleCardPath, ['y', 'mock'])
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('1/1 cards')
      
      const files = await readdir(tempDir)
      const pngFiles = files.filter(file => file.endsWith('.png'))
      expect(pngFiles.length).toBe(1)
    }, 30000)
  })

  describe('Mock Mode Error Simulation', () => {
    test('should handle mock processing errors gracefully', async () => {
      const tempDir = getTempDir()
      const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
      
      // This test would verify error handling in mock mode
      // For iteration 1, we assume mock mode always succeeds
      const result = await cli.runMockMode(deckPath, ['y', 'mock'])
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Success rate: 100%')
    }, 30000)
  })
})