import { CLIOptions, ImageStyle } from '../types.js';
import { logger } from '../utils/logger.js';
import { validateTxtFile } from '../utils/files.js';

export function validateInputFile(deckPath: string): void {
  validateTxtFile(deckPath);
}

export function validateStyleOption(options: CLIOptions): void {
  if (options.style && !['educational', 'medical', 'colorful', 'minimal', 'iconic'].includes(options.style)) {
    logger.error('Invalid style');
    process.exit(1);
  }
}

export function validateConcurrencyOption(options: CLIOptions): void {
  if (options.concurrency !== undefined) {
    const concurrency = Number(options.concurrency);
    if (isNaN(concurrency) || concurrency < 1 || concurrency > 10) {
      logger.error('Concurrency must be between 1 and 10');
      process.exit(1);
    }
    options.concurrency = concurrency;
  }
}

export function validateAllOptions(deckPath: string, options: CLIOptions): void {
  validateInputFile(deckPath);
  validateStyleOption(options);
  validateConcurrencyOption(options);
}