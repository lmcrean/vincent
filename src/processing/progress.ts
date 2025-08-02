import path from 'path';
import { TxtDeck, ImageStyle } from '../types.js';

export function createProgressBar(current: number, total: number, width: number = 20): string {
  const percentage = current / total;
  const filled = Math.round(width * percentage);
  const empty = width - filled;
  
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

export function showDryRunSummary(deck: TxtDeck, outputPath: string, style: ImageStyle): void {
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

export function showCompletionSummary(
  totalCards: number,
  successCount: number,
  failedCount: number,
  outputPath: string,
  outputDir: string,
  isInteractive: boolean = true
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
${isInteractive ? '\nPress Enter to exit...' : ''}`);

  if (isInteractive) {
    process.stdin.once('data', () => {
      process.exit(0);
    });
  }
}