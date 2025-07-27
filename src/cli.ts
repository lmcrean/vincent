#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import prompts from 'prompts';
import { CLIOptions, ImageStyle } from './types.js';
import { logger } from './utils/logger.js';
import { validateApkgFile, generateOutputFilename } from './utils/files.js';
import { ConfigManager } from './config.js';
import { processAnkiDeck } from './index.js';

const program = new Command();

program
  .name('vincent')
  .description('AI image generator for Anki flashcards using Gemini API')
  .version('1.0.0')
  .argument('[deck]', 'Path to .apkg file')
  .option('-o, --output <path>', 'Output file path')
  .option('-s, --style <style>', 'Image style (educational, medical, colorful)', 'educational')
  .option('--dry-run', 'Show what would be done without generating images')
  .option('-v, --verbose', 'Verbose output')
  .action(async (deckPath: string, options: CLIOptions) => {
    try {
      await runVincent(deckPath, options);
    } catch (error) {
      logger.error(error instanceof Error ? error.message : 'Unknown error occurred');
      process.exit(1);
    }
  });

async function runVincent(deckPath: string, options: CLIOptions): Promise<void> {
  // Show welcome header
  showWelcomeHeader();

  // Get deck path if not provided
  if (!deckPath) {
    const response = await prompts({
      type: 'text',
      name: 'deckPath',
      message: 'Enter path to your .apkg file:',
      validate: (value: string) => value.trim() ? true : 'Please provide a file path'
    });
    
    if (!response.deckPath) {
      logger.error('No deck file specified');
      process.exit(1);
    }
    
    deckPath = response.deckPath.trim();
  }

  // Validate input file
  validateApkgFile(deckPath);

  // Setup API key if needed
  await setupApiKey();

  // Get style preference
  const style = await getStylePreference(options.style as ImageStyle);

  // Determine output path
  const outputPath = options.output || generateOutputFilename(deckPath);

  // Show configuration summary
  await showConfigurationSummary(deckPath, outputPath, style);

  // Confirm processing
  const shouldProceed = await confirmProcessing();
  if (!shouldProceed) {
    logger.info('Operation cancelled');
    return;
  }

  // Process the deck
  await processAnkiDeck(deckPath, outputPath, style, options);
}

function showWelcomeHeader(): void {
  console.log(chalk.bold.magenta(`
🎨 Vincent - AI Images for Anki (v1.0)

Transform your flashcards with AI-generated educational images!
`));
}

async function setupApiKey(): Promise<void> {
  const configManager = new ConfigManager();
  let apiKey: string | null = await configManager.getApiKey();

  if (!apiKey) {
    logger.info('First-time setup required');
    console.log(chalk.cyan(`
📝 Gemini API Setup:
   Get your free API key at: https://makersuite.google.com/app/apikey
`));

    const response = await prompts({
      type: 'password',
      name: 'apiKey',
      message: 'Enter your Gemini API key:',
      validate: (value: string) => value.trim() ? true : 'API key is required'
    });

    if (!response.apiKey) {
      throw new Error('API key is required');
    }

    const newApiKey = response.apiKey.trim();
    await configManager.saveApiKey(newApiKey);
    apiKey = newApiKey;
    logger.success('API key saved');
  }

  // Set environment variable for this session
  if (apiKey) {
    process.env.GEMINI_API_KEY = apiKey;
  }
}

async function getStylePreference(defaultStyle?: ImageStyle): Promise<ImageStyle> {
  if (defaultStyle && ['educational', 'medical', 'colorful'].includes(defaultStyle)) {
    return defaultStyle;
  }

  const response = await prompts({
    type: 'select',
    name: 'style',
    message: 'Choose image style:',
    choices: [
      { title: 'Educational - Clean diagrams and labels', value: 'educational' },
      { title: 'Medical - Anatomical, professional style', value: 'medical' },
      { title: 'Colorful - Memorable and engaging visuals', value: 'colorful' }
    ],
    initial: 0
  });

  return response.style || 'educational';
}

async function showConfigurationSummary(
  inputPath: string, 
  outputPath: string, 
  style: ImageStyle
): Promise<void> {
  console.log(chalk.cyan(`
📋 Configuration:
   Input:  ${inputPath}
   Output: ${outputPath}
   Style:  ${style}
`));
}

async function confirmProcessing(): Promise<boolean> {
  console.log(chalk.yellow(`
⚠️  Keep this terminal open during generation!
💰 This uses Gemini's free tier (no cost)
`));

  const response = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: 'Generate images for all cards?',
    initial: true
  });

  return response.confirm;
}

// Handle graceful exit
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n⚠️  Process interrupted by user'));
  console.log(chalk.gray('No session recovery available in this version.'));
  process.exit(0);
});

program.parse();