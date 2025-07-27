import path from 'path';
import fs from 'fs-extra';
import { ImageStyle, CLIOptions, TxtDeck } from './types.js';
import { logger } from './utils/logger.js';
import { ensureDir } from './utils/files.js';
import { TxtParser } from './anki/parser.js';
import { TxtWriter } from './anki/writer.js';
import { ImageGenerator } from './image/generator.js';

export async function processTxtDeck(
  inputPath: string,
  outputPath: string,
  style: ImageStyle,
  options: CLIOptions
): Promise<void> {
  const parser = new TxtParser();
  const writer = new TxtWriter();
  let imageGenerator: ImageGenerator;

  try {
    // Parse the deck
    logger.progress('Analyzing deck...');
    const deck = await parser.parseTxt(inputPath);
    
    logger.success(`Found ${deck.cards.length} cards in "${deck.name}"`);
    
    if (deck.cards.length === 0) {
      logger.warn('No cards found in deck');
      return;
    }

    // Show time estimate
    const estimatedMinutes = Math.ceil(deck.cards.length * 2.5 / 60); // ~2.5 seconds per card
    logger.info(`Estimated time: ${estimatedMinutes}-${estimatedMinutes + 2} minutes`);

    if (options.dryRun) {
      logger.info('Dry run mode - no images will be generated');
      showDryRunSummary(deck, outputPath, style);
      return;
    }

    // Create output directory
    const outputDir = path.join(path.dirname(outputPath), 'vincent-output', 'images');
    await ensureDir(outputDir);

    // Initialize image generator
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('No API key available');
    }
    
    imageGenerator = new ImageGenerator(apiKey, style);

    // Generate images for each card
    logger.progress('Generating images...');
    const generatedImages = new Map<number, string>();
    let completed = 0;
    let failed = 0;

    for (const card of deck.cards) {
      try {
        // Show progress
        completed++;
        const percentage = Math.round((completed / deck.cards.length) * 100);
        const remaining = Math.ceil((deck.cards.length - completed) * 2.5 / 60);
        
        logger.progress(`Processing: Card ${completed}/${deck.cards.length} - "${card.question.substring(0, 50)}${card.question.length > 50 ? '...' : ''}"`);
        
        // Generate image
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

        // Show progress bar
        const progressBar = createProgressBar(completed, deck.cards.length);
        console.log(`${progressBar} ${percentage}% • ~${remaining}m remaining`);

        // Small delay to be respectful to API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        failed++;
        logger.error(`Failed to process card ${card.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Create enhanced deck
    if (generatedImages.size > 0) {
      logger.progress('Creating enhanced deck...');
      
      await writer.writeEnhancedTxt(
        deck,
        generatedImages,
        outputPath
      );

      // Show completion summary
      showCompletionSummary(
        deck.cards.length,
        generatedImages.size,
        failed,
        outputPath,
        outputDir
      );
    } else {
      logger.error('No images were generated successfully');
    }

  } catch (error) {
    logger.error(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

function showDryRunSummary(deck: TxtDeck, outputPath: string, style: ImageStyle): void {
  console.log(`
📋 Dry Run Summary:
   Deck: "${deck.name}"
   Cards: ${deck.cards.length}
   Style: ${style}
   Output: ${outputPath}
   
   Sample cards:
${deck.cards.slice(0, 3).map((card, i) => 
  `   ${i + 1}. Q: "${card.question.substring(0, 40)}${card.question.length > 40 ? '...' : ''}"
      A: "${card.answer.substring(0, 40)}${card.answer.length > 40 ? '...' : ''}"`
).join('\n')}
${deck.cards.length > 3 ? `   ... and ${deck.cards.length - 3} more cards` : ''}
`);
}

function createProgressBar(current: number, total: number, width: number = 20): string {
  const percentage = current / total;
  const filled = Math.round(width * percentage);
  const empty = width - filled;
  
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

function showCompletionSummary(
  totalCards: number,
  successCount: number,
  failedCount: number,
  outputPath: string,
  outputDir: string
): void {
  const successRate = Math.round((successCount / totalCards) * 100);
  
  console.log(`
✅ Complete! ${successCount}/${totalCards} images generated successfully.

📁 Created files:
   • ${path.basename(outputPath)} (ready to import!)
   • ${path.relative(process.cwd(), outputDir)}/ (${successCount} PNG files)

⏱️  Total time: ${Math.ceil(totalCards * 2.5 / 60)} minutes
💰 Cost: $0.00 (free tier)
📊 Success rate: ${successRate}%
${failedCount > 0 ? `⚠️  ${failedCount} cards failed to generate` : ''}

📲 Next step: Import ${path.basename(outputPath)} into Anki

Press Enter to exit...`);

  // Wait for user input before exiting
  process.stdin.once('data', () => {
    process.exit(0);
  });
}