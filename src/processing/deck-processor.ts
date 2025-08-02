import path from 'path';
import { ImageStyle, CLIOptions } from '../types.js';
import { logger } from '../utils/logger.js';
import { TxtParser } from '../anki/parser.js';
import { ImageGenerator } from '../image/generator.js';
import { createOutputDirectory, writeEnhancedDeck } from './output.js';
import { createProgressBar, showDryRunSummary, showCompletionSummary } from './progress.js';

export async function processTxtDeck(
  inputPath: string,
  outputPath: string,
  style: ImageStyle,
  options: CLIOptions,
  isInteractive: boolean = true
): Promise<void> {
  const parser = new TxtParser();
  let imageGenerator: ImageGenerator;

  try {
    logger.progress('Analyzing deck...');
    const deck = await parser.parseTxt(inputPath);
    
    logger.success(`Found ${deck.cards.length} cards in "${deck.name}"`);
    
    if (deck.cards.length === 0) {
      logger.warn('No cards found in deck');
      return;
    }

    const estimatedMinutes = Math.ceil(deck.cards.length * 2.5 / 60);
    logger.info(`Estimated time: ${estimatedMinutes}-${estimatedMinutes + 2} minutes`);

    if (options.dryRun) {
      logger.info('Dry run mode - no images will be generated');
      showDryRunSummary(deck, outputPath, style);
      return;
    }

    const outputDir = await createOutputDirectory(outputPath);

    // Determine image generation mode
    const mode = options.mock ? 'mock' : 'pollinations';
    
    imageGenerator = new ImageGenerator(mode, style);

    logger.progress('Generating images...');
    const generatedImages = new Map<number, string>();
    let completed = 0;
    let failed = 0;

    for (const card of deck.cards) {
      try {
        completed++;
        const percentage = Math.round((completed / deck.cards.length) * 100);
        const remaining = Math.ceil((deck.cards.length - completed) * 2.5 / 60);
        
        logger.progress(`Processing: Card ${completed}/${deck.cards.length} - "${card.question.substring(0, 50)}${card.question.length > 50 ? '...' : ''}"`);
        
        const result = await imageGenerator.generateImage(
          card.id,
          card.question,
          card.answer,
          outputDir
        );

        if (result.success && result.imagePath) {
          generatedImages.set(card.id, result.imagePath);
          logger.success(`✓ Image generated: ${path.basename(result.imagePath)}`);
        } else {
          failed++;
          logger.warn(`✗ Failed: ${result.error || 'Unknown error'}`);
        }

        const progressBar = createProgressBar(completed, deck.cards.length);
        console.log(`${progressBar} ${percentage}% • ~${remaining}m remaining`);

        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        failed++;
        logger.error(`Failed to process card ${card.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    await writeEnhancedDeck(deck, generatedImages, outputPath);

    showCompletionSummary(
      deck.cards.length,
      generatedImages.size,
      failed,
      outputPath,
      outputDir,
      isInteractive
    );

  } catch (error) {
    logger.error(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}