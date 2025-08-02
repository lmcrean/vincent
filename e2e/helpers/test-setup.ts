import { beforeAll, afterEach } from 'vitest'
import { dir as tmpdir } from 'tmp-promise'
import { ensureDir, remove, pathExists } from 'fs-extra'
import path from 'path'
import { CLIRunner } from './cli-runner.js'

export interface TestEnvironment {
  tmpDir: string
  cleanup: () => Promise<void>
}

/**
 * Creates a temporary directory for test isolation
 */
export async function createTestEnvironment(): Promise<TestEnvironment> {
  const tmpDir = await tmpdir({ unsafeCleanup: true })
  
  // Set isolated config directory for this test
  process.env.VINCENT_TEST_HOME_DIR = path.join(tmpDir.path, '.vincent-test')
  
  return {
    tmpDir: tmpDir.path,
    cleanup: async () => {
      try {
        await remove(tmpDir.path)
      } catch (error) {
        console.warn(`Failed to cleanup test directory: ${error}`)
      }
      // Clean up env variable
      delete process.env.VINCENT_TEST_HOME_DIR
      tmpDir.cleanup()
    }
  }
}

/**
 * Ensures Vincent CLI is built before running E2E tests
 */
export async function ensureVincentBuilt(): Promise<void> {
  const cliExists = await CLIRunner.checkCLIExists()
  
  if (!cliExists) {
    throw new Error(
      'Vincent CLI not found. Please run "npm run build" in the root directory before running E2E tests.'
    )
  }
}

/**
 * Global test setup
 */
beforeAll(async () => {
  await ensureVincentBuilt()
}, 10000)

/**
 * Setup function for individual test suites
 */
export function setupTestSuite() {
  let testEnv: TestEnvironment | null = null

  beforeAll(async () => {
    testEnv = await createTestEnvironment()
  })

  afterEach(async () => {
    // Clean up any files created during the test
    if (testEnv) {
      const files = await import('fs-extra')
      const dirs = await files.readdir(testEnv.tmpDir)
      
      for (const dir of dirs) {
        const fullPath = path.join(testEnv.tmpDir, dir)
        try {
          await files.remove(fullPath)
        } catch (error) {
          console.warn(`Failed to clean up test file ${fullPath}: ${error}`)
        }
      }
    }
  })

  const getTempDir = (): string => {
    if (!testEnv) {
      throw new Error('Test environment not initialized')
    }
    return testEnv.tmpDir
  }

  const cleanup = async (): Promise<void> => {
    if (testEnv) {
      await testEnv.cleanup()
      testEnv = null
    }
  }

  return { getTempDir, cleanup }
}

/**
 * Helper to validate test file structure
 */
export async function validateTestFiles(baseDir: string, expectedFiles: string[]): Promise<boolean> {
  for (const file of expectedFiles) {
    const filePath = path.join(baseDir, file)
    const exists = await pathExists(filePath)
    if (!exists) {
      return false
    }
  }
  return true
}

/**
 * Helper to create test fixtures in temp directory
 */
export async function setupTestFixtures(tempDir: string, fixtures: Record<string, string>): Promise<void> {
  const { writeFile, ensureDir } = await import('fs-extra')
  
  for (const [filePath, content] of Object.entries(fixtures)) {
    const fullPath = path.join(tempDir, filePath)
    const dir = path.dirname(fullPath)
    
    await ensureDir(dir)
    await writeFile(fullPath, content, 'utf8')
  }
}