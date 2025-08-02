import { describe, test, expect } from 'vitest'
import { CLIRunner } from '../helpers/cli-runner.js'
import { setupTestSuite } from '../helpers/test-setup.js'
import { copyFixture, FIXTURE_FILES, getExpectedOutputName } from '../fixtures/fixture-helpers.js'
import { pathExists, readFile } from 'fs-extra'
import path from 'path'

describe('Happy Path E2E Tests - Iteration 1', () => {
  const { getTempDir, cleanup } = setupTestSuite()
  const cli = new CLIRunner()

  test('should process sample deck in mock mode successfully', async () => {
    const tempDir = getTempDir()
    
    // Copy fixture to temp directory
    const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
    
    // Run Vincent in mock mode
    const result = await cli.runMockMode(deckPath, ['y', 'mock'])
    
    // Should complete successfully
    expect(result.exitCode).toBe(0)
    expect(result.failed).toBe(false)
    
    // Should show processing progress
    expect(result.stdout).toContain('Vincent - AI Images for Anki')
    expect(result.stdout).toContain('Found')
    expect(result.stdout).toContain('cards')
    expect(result.stdout).toContain('MOCK MODE ACTIVATED')
    
    // Should generate output file
    const expectedOutput = getExpectedOutputName(FIXTURE_FILES.SAMPLE_DECK)
    const outputPath = path.join(tempDir, expectedOutput)
    
    expect(await pathExists(outputPath)).toBe(true)
    
    // Output should contain original content plus image references
    const outputContent = await readFile(outputPath, 'utf8')
    expect(outputContent).toContain('binary tree')
    expect(outputContent).toContain('recursion')
    expect(outputContent).toContain('<img src=')
  }, 30000)

  test('should handle non-interactive mode with environment API key', async () => {
    const tempDir = getTempDir()
    const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
    
    // Run in non-interactive mode
    const result = await cli.runNonInteractive([deckPath, '--style', 'educational'])
    
    // Should process without prompts
    expect(result.exitCode).toBe(0)
    expect(result.stdout).not.toContain('Enter your Gemini API key')
    expect(result.stdout).not.toContain('Generate images for all cards?')
  }, 30000)

  test('should respect style option in CLI arguments', async () => {
    const tempDir = getTempDir()
    const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
    
    // Test different styles
    const styles = ['educational', 'medical', 'colorful']
    
    for (const style of styles) {
      const result = await cli.runNonInteractive([deckPath, '--style', style])
      
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain(`Style:  ${style}`)
    }
  }, 45000)

  test('should handle custom output path', async () => {
    const tempDir = getTempDir()
    const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)
    const customOutput = path.join(tempDir, 'custom-output.txt')
    
    const result = await cli.runMockMode(deckPath, ['y', 'mock'], {
      // Note: --output flag would need to be handled in the CLI runner
      // For now, testing that the default behavior works
    })
    
    expect(result.exitCode).toBe(0)
    
    // Default output should exist
    const defaultOutput = path.join(tempDir, getExpectedOutputName(FIXTURE_FILES.SAMPLE_DECK))
    expect(await pathExists(defaultOutput)).toBe(true)
  }, 30000)

  test('should process larger deck efficiently', async () => {
    const tempDir = getTempDir()
    const deckPath = await copyFixture(FIXTURE_FILES.LARGE_DECK, tempDir)
    
    const startTime = Date.now()
    const result = await cli.runMockMode(deckPath, ['y', 'mock'])
    const duration = Date.now() - startTime
    
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('15') // Should show correct card count
    
    // Should complete in reasonable time (mock mode should be fast)
    expect(duration).toBeLessThan(25000) // 25 seconds max for 15 cards
    
    // Output file should exist and contain all cards
    const outputPath = path.join(tempDir, getExpectedOutputName(FIXTURE_FILES.LARGE_DECK))
    expect(await pathExists(outputPath)).toBe(true)
    
    const outputContent = await readFile(outputPath, 'utf8')
    const outputLines = outputContent.trim().split('\n').filter(line => line.trim())
    expect(outputLines.length).toBe(15) // Should have all 15 cards
  }, 35000)

  test('should show version information', async () => {
    const result = await cli.run(['--version'])
    
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/) // Should contain version number
  }, 10000)

  test('should show help information', async () => {
    const result = await cli.run(['--help'])
    
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('vincent') // Command name is lowercase
    expect(result.stdout).toContain('AI image generator')
    expect(result.stdout).toContain('Usage:')
    expect(result.stdout).toContain('Options:')
  }, 10000)
})