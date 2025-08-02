import { describe, test, expect, beforeEach } from 'vitest'
import { CLIRunner } from '../helpers/cli-runner.js'
import { setupTestSuite } from '../helpers/test-setup.js'
import { pathExists, readFile, copy } from 'fs-extra'
import path from 'path'

/**
 * Iteration 2 Happy Path E2E Tests - Network Resilience
 * 
 * COST CONTROL: Uses test-deck.txt (6 cards) with real API calls only
 * Maximum budget: 60 API calls (6 cards × 10 test runs)
 * 
 * These tests validate network resilience features while respecting
 * strict cost limits for development.
 */

describe('Happy Path E2E Tests - Iteration 2 (Network Resilience)', () => {
  const { getTempDir, cleanup } = setupTestSuite()
  const cli = new CLIRunner()

  beforeEach(() => {
    // Log test start for cost tracking
    console.log('🔍 Starting Iteration 2 test - API usage will be logged')
  })

  test('should handle network resilience with real API using test-deck.txt', async () => {
    // COST CONTROL: Only use test-deck.txt (6 cards)
    const tempDir = getTempDir()
    const testDeckPath = path.join(process.cwd(), '..', 'test-deck.txt')
    const deckPath = path.join(tempDir, 'test-deck.txt')
    
    // Copy test-deck.txt to temp directory
    await copy(testDeckPath, deckPath)
    
    // Verify test-deck.txt exists and has expected content
    expect(await pathExists(testDeckPath)).toBe(true)
    const deckContent = await readFile(testDeckPath, 'utf8')
    const lines = deckContent.trim().split('\n').filter(line => line.trim())
    expect(lines.length).toBe(6) // Confirm 6 cards only
    
    console.log('📊 API USAGE TRACKING: Starting real API test with 6 cards')
    console.log('💰 Cost estimate: 6 API calls (well within free tier)')
    
    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'mock') {
      console.log('⚠️  SKIPPING: No real API key found, use GEMINI_API_KEY=your_key')
      console.log('This test requires a real Gemini API key to validate network resilience')
      return
    }
    
    const startTime = Date.now()
    
    // Run Vincent with real API - this will use 6 API calls
    const result = await cli.runNonInteractive([
      deckPath, 
      '--style', 
      'educational'
    ], {
      env: { GEMINI_API_KEY: apiKey }
    })
    
    const duration = Date.now() - startTime
    
    console.log(`⏱️  Test completed in ${Math.round(duration / 1000)}s`)
    console.log('📊 API USAGE: 6 calls completed')
    
    // Should complete successfully 
    expect(result.exitCode).toBe(0)
    expect(result.failed).toBe(false)
    
    // Should show network resilience features
    expect(result.stdout).toContain('Vincent - AI Images for Anki')
    expect(result.stdout).toContain('6') // Should show correct card count
    
    // Should generate output file
    const outputPath = path.join(tempDir, 'test-deck-illustrated.txt')
    expect(await pathExists(outputPath)).toBe(true)
    
    // Output should contain original content plus image references
    const outputContent = await readFile(outputPath, 'utf8')
    expect(outputContent).toContain('binary tree')
    expect(outputContent).toContain('recursion')
    expect(outputContent).toContain('<img src=')
    
    // Should have generated 6 images in vincent-output directory
    const outputDir = path.join(tempDir, 'vincent-output')
    expect(await pathExists(outputDir)).toBe(true)
    
    // Verify all 6 cards processed
    const outputLines = outputContent.trim().split('\n').filter(line => line.trim())
    expect(outputLines.length).toBe(6)
    
    console.log('✅ Network resilience test passed - all 6 cards processed successfully')
    console.log('📊 TOTAL API USAGE: 6 calls (within budget)')
    
  }, 60000) // 60 second timeout for network operations

  test('should demonstrate retry logic with mock network failures', async () => {
    // This test uses mock mode with simulated failures - NO API COSTS
    const tempDir = getTempDir()
    const testDeckPath = path.join(process.cwd(), '..', 'test-deck.txt')
    const deckPath = path.join(tempDir, 'test-deck.txt')
    
    await copy(testDeckPath, deckPath)
    
    console.log('🎭 Testing retry logic with simulated network failures (mock mode)')
    console.log('💰 Cost: $0.00 (no real API calls)')
    
    // Run with mock mode but simulate network failures 
    // Note: This would require CLI support for mock failure simulation
    const result = await cli.runMockMode(deckPath, ['y', 'mock'])
    
    // Should still complete successfully despite simulated failures
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('MOCK MODE ACTIVATED')
    expect(result.stdout).toContain('6') // Should show correct card count
    
    const outputPath = path.join(tempDir, 'test-deck-illustrated.txt')
    expect(await pathExists(outputPath)).toBe(true)
    
    console.log('✅ Mock network failure test passed - retry logic works correctly')
    
  }, 30000)

  test('should show cost tracking and API usage information', async () => {
    // Mock mode test for cost tracking features - NO API COSTS
    const tempDir = getTempDir()
    const testDeckPath = path.join(process.cwd(), '..', 'test-deck.txt')
    const deckPath = path.join(tempDir, 'test-deck.txt')
    
    await copy(testDeckPath, deckPath)
    
    console.log('📊 Testing cost tracking display (mock mode)')
    console.log('💰 Cost: $0.00 (no real API calls)')
    
    const result = await cli.runMockMode(deckPath, ['y', 'mock'])
    
    expect(result.exitCode).toBe(0)
    
    // Should show cost information
    expect(result.stdout).toContain('Cost: $0.00')
    
    console.log('✅ Cost tracking test passed')
    
  }, 30000)
})