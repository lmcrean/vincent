export interface AnkiCard {
  id: number;
  nid: number;
  question: string;
  answer: string;
  fields: string[];
  tags: string[];
}

export interface AnkiDeck {
  name: string;
  cards: AnkiCard[];
  mediaFiles: Map<string, Buffer>;
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
  style: 'educational' | 'medical' | 'colorful' | 'minimal';
  outputDir: string;
}

export type ImageStyle = 'educational' | 'medical' | 'colorful' | 'minimal';

export interface CLIOptions {
  output?: string;
  style?: ImageStyle;
  dryRun?: boolean;
  verbose?: boolean;
  concurrency?: number;
}