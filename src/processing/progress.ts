import path from 'path';
import { TxtDeck, ImageStyle } from '../types.js';

export interface NetworkStatus {
  status: 'connecting' | 'connected' | 'retrying' | 'rate_limited' | 'error';
  attempt?: number;
  maxAttempts?: number;
  retryDelay?: number;
  errorMessage?: string;
}

export function createProgressBar(current: number, total: number, width: number = 20): string {
  const percentage = current / total;
  const filled = Math.round(width * percentage);
  const empty = width - filled;
  
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

export function formatNetworkStatus(status: NetworkStatus): string {
  switch (status.status) {
    case 'connecting':
      return '🔄 Connecting...';
    case 'connected':
      return '✅ Connected';
    case 'retrying':
      const delay = status.retryDelay ? ` (${status.retryDelay}s delay)` : '';
      return `🔄 Retrying... attempt ${status.attempt}/${status.maxAttempts}${delay}`;
    case 'rate_limited':
      const waitTime = status.retryDelay ? ` (wait ${status.retryDelay}s)` : '';
      return `⏳ Rate limited${waitTime}`;
    case 'error':
      return `❌ ${status.errorMessage || 'Network error'}`;
    default:
      return '';
  }
}

export function showCardProgress(
  cardId: number,
  total: number,
  question: string,
  networkStatus?: NetworkStatus
): void {
  const progressBar = createProgressBar(cardId, total);
  const percentage = Math.round((cardId / total) * 100);
  const remaining = Math.max(0, total - cardId);
  const estimatedMinutes = Math.ceil(remaining * 2.5 / 60);
  
  const truncatedQuestion = question.length > 50 
    ? question.substring(0, 47) + '...'
    : question;
  
  console.log(`\nProcessing card ${cardId}/${total}: "${truncatedQuestion}"`);
  console.log(`${progressBar} ${percentage}% • ~${estimatedMinutes}m remaining`);
  
  if (networkStatus) {
    console.log(formatNetworkStatus(networkStatus));
  }
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
  isInteractive: boolean = true,
  apiCallCount: number = 0
): void {
  const successRate = Math.round((successCount / totalCards) * 100);
  
  console.log(`
✅ Complete! ${successCount}/${totalCards} images generated successfully.

📁 Created files:
   • ${path.basename(outputPath)} (ready to import!)
   • ${path.relative(process.cwd(), outputDir)}/ (${successCount} PNG files)

⏱️  Total time: ${Math.ceil(totalCards * 2.5 / 60)} minutes
💰 Cost: $0.00 (free tier)
📊 API calls used: ${apiCallCount} (within 10,000 daily limit)
📈 Success rate: ${successRate}%
${failedCount > 0 ? `⚠️  ${failedCount} cards failed to generate` : ''}

📲 Next step: Import ${path.basename(outputPath)} into Anki
${isInteractive ? '\nPress Enter to exit...' : ''}`);

  if (isInteractive) {
    process.stdin.once('data', () => {
      process.exit(0);
    });
  }
}