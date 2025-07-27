import path from 'path'
import { readFile, copyFile } from 'fs-extra'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const FIXTURES_DIR = __dirname

export const FIXTURE_FILES = {
  SAMPLE_DECK: 'sample-deck.txt',
  INVALID_DECK: 'invalid-deck.txt', 
  EMPTY_DECK: 'empty-deck.txt',
  LARGE_DECK: 'large-deck.txt'
} as const

/**
 * Get the full path to a fixture file
 */
export function getFixturePath(filename: string): string {
  return path.join(FIXTURES_DIR, filename)
}

/**
 * Read a fixture file as text
 */
export async function readFixture(filename: string): Promise<string> {
  const filePath = getFixturePath(filename)
  return readFile(filePath, 'utf8')
}

/**
 * Copy a fixture file to a target directory
 */
export async function copyFixture(filename: string, targetDir: string, newName?: string): Promise<string> {
  const sourcePath = getFixturePath(filename)
  const targetName = newName || filename
  const targetPath = path.join(targetDir, targetName)
  
  await copyFile(sourcePath, targetPath)
  return targetPath
}

/**
 * Parse cards from a deck fixture for testing
 */
export async function parseFixtureCards(filename: string): Promise<Array<{question: string, answer: string}>> {
  const content = await readFixture(filename)
  const lines = content.trim().split('\n').filter(line => line.trim())
  
  return lines.map(line => {
    const [question, answer] = line.split(';')
    return {
      question: question?.trim() || '',
      answer: answer?.trim() || ''
    }
  })
}

/**
 * Get expected output filename for a given input
 */
export function getExpectedOutputName(inputFilename: string): string {
  const baseName = path.basename(inputFilename, '.txt')
  return `${baseName}-illustrated.txt`
}

/**
 * Generate expected image filenames for a deck
 */
export async function getExpectedImageNames(deckFilename: string): Promise<string[]> {
  const cards = await parseFixtureCards(deckFilename)
  
  return cards.map((_, index) => {
    // This would match the actual image naming logic from Vincent
    // For now, using a simple pattern that matches mock implementation
    const suffix = Math.random().toString(36).substring(2, 8)
    return `generated_image_${index + 1}_${suffix}.png`
  })
}