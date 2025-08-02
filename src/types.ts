export interface TxtCard {
  id: number;
  question: string;
  answer: string;
}

export interface TxtDeck {
  name: string;
  cards: TxtCard[];
}

export interface ImageRequest {
  cardId: number;
  prompt: string;
  outputPath: string;
}

export interface GenerationResult {
  cardId: number;
  success: boolean;
  imagePath?: string;
  error?: string;
}

export interface Config {
  apiKey: string;
  style: 'educational' | 'medical' | 'colorful' | 'minimal' | 'iconic';
  outputDir: string;
}

export type ImageStyle = 'educational' | 'medical' | 'colorful' | 'minimal' | 'iconic';

export interface CLIOptions {
  output?: string;
  style?: ImageStyle;
  dryRun?: boolean;
  verbose?: boolean;
  concurrency?: number;
  mock?: boolean;
}