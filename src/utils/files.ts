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

export function validateApkgFile(filePath: string): void {
  if (!filePath.endsWith('.apkg')) {
    throw new FileError(`File '${filePath}' is not a valid Anki deck (.apkg)`);
  }
  
  if (!fs.existsSync(filePath)) {
    throw new FileError(`Could not find file '${filePath}'`);
  }
}

export function generateOutputFilename(inputPath: string, suffix: string = 'illustrated'): string {
  const dir = path.dirname(inputPath);
  const baseName = path.basename(inputPath, '.apkg');
  return path.join(dir, `${baseName}-${suffix}.apkg`);
}

export async function createTempDir(): Promise<string> {
  const tempDir = path.join(process.cwd(), 'tmp-vincent-' + Date.now());
  await ensureDir(tempDir);
  return tempDir;
}