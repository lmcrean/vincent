import prompts from 'prompts';
import { ImageStyle } from '../types.js';
import { logger } from '../utils/logger.js';
import { ConfigManager } from '../config.js';
import { showApiSetupInfo, showWarnings } from './display.js';

export async function promptForDeckPath(): Promise<string> {
  const response = await prompts({
    type: 'text',
    name: 'deckPath',
    message: 'Enter path to your .txt file:',
    validate: (value: string) => value.trim() ? true : 'Please provide a file path'
  });
  
  if (!response.deckPath) {
    logger.error('No deck file specified');
    process.exit(1);
  }
  
  return response.deckPath.trim();
}

export async function setupApiKey(isInteractive: boolean = true, mockMode: boolean = false): Promise<void> {
  console.log('🐛 DEBUG: setupApiKey called with isInteractive:', isInteractive, 'mockMode:', mockMode);
  console.log('🐛 DEBUG: GEMINI_API_KEY at start of setupApiKey:', JSON.stringify(process.env.GEMINI_API_KEY));
  
  if (mockMode) {
    process.env.GEMINI_API_KEY = 'mock';
    console.log('🧪 Mock mode enabled - using placeholder images');
    console.log('🐛 DEBUG: Set GEMINI_API_KEY to "mock"');
    console.log('🐛 DEBUG: GEMINI_API_KEY after setting:', JSON.stringify(process.env.GEMINI_API_KEY));
    return;
  }

  const configManager = new ConfigManager();
  let apiKey: string | null = await configManager.getApiKey();

  if (!apiKey) {
    apiKey = process.env.GEMINI_API_KEY || null;
  }

  if (!apiKey) {
    if (isInteractive) {
      logger.info('First-time setup required');
      showApiSetupInfo();

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
    } else {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is required');
      }
      apiKey = process.env.GEMINI_API_KEY;
    }
  }

  if (apiKey) {
    process.env.GEMINI_API_KEY = apiKey;
  }
}

export async function getStylePreference(defaultStyle?: ImageStyle, isInteractive: boolean = true): Promise<ImageStyle> {
  if (defaultStyle && ['educational', 'medical', 'colorful', 'minimal'].includes(defaultStyle)) {
    return defaultStyle;
  }

  if (!isInteractive) {
    return 'educational';
  }

  const response = await prompts({
    type: 'select',
    name: 'style',
    message: 'Choose image style:',
    choices: [
      { title: 'Educational - Clean diagrams and labels', value: 'educational' },
      { title: 'Medical - Anatomical, professional style', value: 'medical' },
      { title: 'Colorful - Memorable and engaging visuals', value: 'colorful' },
      { title: 'Minimal - Simple, clean icons', value: 'minimal' }
    ],
    initial: 0
  });

  return response.style || 'educational';
}

export async function confirmProcessing(): Promise<boolean> {
  showWarnings();

  const response = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: 'Generate images for all cards?',
    initial: true
  });

  return response.confirm;
}