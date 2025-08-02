import fs from 'fs-extra';
import path from 'path';
import { FileError } from './errors.js';

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.ensureDir(dirPath);
  } catch (error) {
    throw new FileError(`Failed to create directory: ${dirPath}`);
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function validateTxtFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new FileError('File not found');
  }
  
  const stats = fs.statSync(filePath);
  if (stats.isDirectory()) {
    throw new FileError('Path must be a file, not a directory');
  }
  
  if (!filePath.endsWith('.txt')) {
    throw new FileError('Input file must be a .txt file');
  }
}

export function generateOutputFilename(inputPath: string, suffix: string = 'illustrated'): string {
  const dir = path.dirname(inputPath);
  const baseName = path.basename(inputPath, '.txt');
  return path.join(dir, 'vincent-output', `${baseName}-${suffix}.txt`);
}

export async function createTempDir(): Promise<string> {
  const tempDir = path.join(process.cwd(), 'tmp-vincent-' + Date.now());
  await ensureDir(tempDir);
  return tempDir;
}