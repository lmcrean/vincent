import chalk from 'chalk';
import { ImageStyle } from '../types.js';

export function showWelcomeHeader(isInteractive: boolean = true): void {
  if (isInteractive) {
    console.log(chalk.hex('#FF6B35')(`
██╗   ██╗██╗███╗   ██╗ ██████╗███████╗███╗   ██╗████████╗
██║   ██║██║████╗  ██║██╔════╝██╔════╝████╗  ██║╚══██╔══╝
██║   ██║██║██╔██╗ ██║██║     █████╗  ██╔██╗ ██║   ██║   
╚██╗ ██╔╝██║██║╚██╗██║██║     ██╔══╝  ██║╚██╗██║   ██║   
 ╚████╔╝ ██║██║ ╚████║╚██████╗███████╗██║ ╚████║   ██║   
  ╚═══╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   
`));
    console.log(chalk.hex('#4A90E2')(`AI Images for Anki (v1.0)

Transform your flashcards with AI-generated educational images!
`));
  } else {
    console.log('Vincent - AI Images for Anki');
  }
}

export async function showConfigurationSummary(
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

export function showApiSetupInfo(): void {
  console.log(chalk.cyan(`
📝 Gemini API Setup:
   Get your free API key at: https://makersuite.google.com/app/apikey
`));
}

export function showWarnings(): void {
  console.log(chalk.yellow(`
⚠️  Keep this terminal open during generation!
💰 This uses Gemini's free tier (no cost)
`));
}