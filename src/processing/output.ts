import path from 'path';
import { ensureDir } from '../utils/files.js';
import { TxtWriter } from '../anki/writer.js';
import { TxtDeck } from '../types.js';
import { logger } from '../utils/logger.js';

export async function createOutputDirectory(outputPath: string): Promise<string> {
  const outputDir = path.join(path.dirname(outputPath), 'vincent-output', 'images');
  await ensureDir(outputDir);
  return outputDir;
}

export async function writeEnhancedDeck(
  deck: TxtDeck,
  generatedImages: Map<number, string>,
  outputPath: string
): Promise<void> {
  if (generatedImages.size === 0) {
    throw new Error('No images were generated successfully');
  }

  logger.progress('Creating enhanced deck...');
  const writer = new TxtWriter();
  await writer.writeEnhancedTxt(deck, generatedImages, outputPath);
}