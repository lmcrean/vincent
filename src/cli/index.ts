#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import { CLIOptions, ImageStyle } from '../types.js';
import { logger } from '../utils/logger.js';
import { generateOutputFilename } from '../utils/files.js';
import { processTxtDeck } from '../index.js';
import { 
  promptForDeckPath, 
  setupApiKey, 
  getStylePreference, 
  confirmProcessing 
} from './interaction.js';
import { validateAllOptions } from './validation.js';
import { showWelcomeHeader, showConfigurationSummary } from './display.js';

const program = new Command();

program
  .name('vincent')
  .description('AI image generator for Anki flashcards using Gemini API')
  .version('1.0.0')
  .argument('[deck]', 'Path to .txt file')
  .option('-o, --output <path>', 'Output file path')
  .option('-s, --style <style>', 'Image style (educational, medical, colorful)', 'educational')
  .option('-g, --generator <type>', 'Image generator (pollinations, huggingface, mock)', 'pollinations')
  .option('-c, --concurrency <number>', 'Number of concurrent image generations (1-10)', '3')
  .option('--dry-run', 'Show what would be done without generating images')
  .option('--mock', 'Use mock mode for testing (no API calls)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (deckPath: string, options: CLIOptions) => {
    try {
      console.log('🐛 DEBUG: process.argv:', process.argv);
      console.log('🐛 DEBUG: deckPath argument:', deckPath);
      console.log('🐛 DEBUG: Parsed options:', JSON.stringify(options, null, 2));
      console.log('🐛 DEBUG: Mock flag value:', options.mock);
      console.log('🐛 DEBUG: GEMINI_API_KEY env var:', process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET');
      
      await runVincent(deckPath, options);
    } catch (error) {
      logger.error(error instanceof Error ? error.message : 'Unknown error occurred');
      process.exit(1);
    }
  });

async function runVincent(deckPath: string, options: CLIOptions): Promise<void> {
  console.log('🐛 DEBUG: Environment check - NODE_ENV:', process.env.NODE_ENV, 'CI:', process.env.CI, 'isTTY:', process.stdin.isTTY);
  const isInteractive = !!process.stdin.isTTY && process.env.NODE_ENV !== 'test' && process.env.CI !== 'true';
  console.log('🐛 DEBUG: isInteractive calculated as:', isInteractive);

  showWelcomeHeader(isInteractive);

  if (!deckPath) {
    if (isInteractive) {
      deckPath = await promptForDeckPath();
    } else {
      logger.error('error: required argument \'deck\' not provided');
      process.exit(1);
    }
  }

  validateAllOptions(deckPath, options);
  
  // Display generator selection info
  if (isInteractive) {
    const generator = options.mock ? 'mock' : (options.generator || 'pollinations');
    switch (generator) {
      case 'mock':
        console.log('🧪 Using MOCK mode for testing');
        console.log('✅ No API calls will be made');
        break;
      case 'huggingface':
        console.log('🤗 Using Hugging Face DALL-E 3 XL LoRA v2');
        console.log('✅ High-quality image generation');
        console.log('✅ No API key required - free Hugging Face Space');
        break;
      case 'pollinations':
      default:
        console.log('🌸 Using Pollinations AI for image generation');
        console.log('✅ No API key required - completely free service');
        console.log('🌍 Available globally including UK');
        break;
    }
  }
  
  const style = await getStylePreference(options.style as ImageStyle, isInteractive);
  const outputPath = options.output || generateOutputFilename(deckPath);

  if (isInteractive) {
    await showConfigurationSummary(deckPath, outputPath, style);
    const shouldProceed = await confirmProcessing();
    if (!shouldProceed) {
      logger.info('Operation cancelled');
      return;
    }
  }

  await processTxtDeck(deckPath, outputPath, style, options, isInteractive);
}

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n⚠️  Process interrupted by user'));
  console.log(chalk.gray('No session recovery available in this version.'));
  process.exit(0);
});

program.parse();