import { describe, it, expect } from 'vitest';
import type { 
  AnkiCard, 
  AnkiDeck, 
  ImageRequest, 
  GenerationResult, 
  Config, 
  ImageStyle, 
  CLIOptions 
} from '../types.js';

describe('TypeScript interfaces and types', () => {
  describe('AnkiCard interface', () => {
    it('should accept valid AnkiCard object', () => {
      const card: AnkiCard = {
        id: 1,
        nid: 100,
        question: 'What is photosynthesis?',
        answer: 'The process by which plants convert light energy into chemical energy',
        fields: ['What is photosynthesis?', 'The process by which plants convert light energy into chemical energy'],
        tags: ['biology', 'plants']
      };

      expect(card.id).toBe(1);
      expect(card.nid).toBe(100);
      expect(card.question).toBe('What is photosynthesis?');
      expect(card.answer).toBe('The process by which plants convert light energy into chemical energy');
      expect(card.fields).toHaveLength(2);
      expect(card.tags).toContain('biology');
    });

    it('should handle empty arrays for fields and tags', () => {
      const card: AnkiCard = {
        id: 2,
        nid: 200,
        question: 'Simple question',
        answer: 'Simple answer',
        fields: [],
        tags: []
      };

      expect(card.fields).toEqual([]);
      expect(card.tags).toEqual([]);
    });
  });

  describe('AnkiDeck interface', () => {
    it('should accept valid AnkiDeck object', () => {
      const deck: AnkiDeck = {
        name: 'Biology Deck',
        cards: [
          {
            id: 1,
            nid: 100,
            question: 'What is a cell?',
            answer: 'The basic unit of life',
            fields: ['What is a cell?', 'The basic unit of life'],
            tags: ['biology']
          }
        ],
        mediaFiles: new Map([
          ['image1.png', Buffer.from('fake-image-data')]
        ])
      };

      expect(deck.name).toBe('Biology Deck');
      expect(deck.cards).toHaveLength(1);
      expect(deck.mediaFiles.size).toBe(1);
      expect(deck.mediaFiles.has('image1.png')).toBe(true);
    });

    it('should handle empty cards and media files', () => {
      const deck: AnkiDeck = {
        name: 'Empty Deck',
        cards: [],
        mediaFiles: new Map()
      };

      expect(deck.cards).toEqual([]);
      expect(deck.mediaFiles.size).toBe(0);
    });
  });

  describe('ImageRequest interface', () => {
    it('should accept valid ImageRequest object', () => {
      const request: ImageRequest = {
        cardId: 123,
        prompt: 'Create an educational illustration of photosynthesis',
        outputPath: '/path/to/output/image.png'
      };

      expect(request.cardId).toBe(123);
      expect(request.prompt).toBe('Create an educational illustration of photosynthesis');
      expect(request.outputPath).toBe('/path/to/output/image.png');
    });
  });

  describe('GenerationResult interface', () => {
    it('should accept successful generation result', () => {
      const result: GenerationResult = {
        cardId: 456,
        success: true,
        imagePath: '/path/to/generated/image.png'
      };

      expect(result.cardId).toBe(456);
      expect(result.success).toBe(true);
      expect(result.imagePath).toBe('/path/to/generated/image.png');
      expect(result.error).toBeUndefined();
    });

    it('should accept failed generation result', () => {
      const result: GenerationResult = {
        cardId: 789,
        success: false,
        error: 'API rate limit exceeded'
      };

      expect(result.cardId).toBe(789);
      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
      expect(result.imagePath).toBeUndefined();
    });

    it('should accept result with both imagePath and error', () => {
      const result: GenerationResult = {
        cardId: 101,
        success: false,
        imagePath: '/path/to/partial/image.png',
        error: 'Partial generation failure'
      };

      expect(result.cardId).toBe(101);
      expect(result.success).toBe(false);
      expect(result.imagePath).toBe('/path/to/partial/image.png');
      expect(result.error).toBe('Partial generation failure');
    });
  });

  describe('Config interface', () => {
    it('should accept valid Config object with educational style', () => {
      const config: Config = {
        apiKey: 'test-api-key-123',
        style: 'educational',
        outputDir: '/path/to/output'
      };

      expect(config.apiKey).toBe('test-api-key-123');
      expect(config.style).toBe('educational');
      expect(config.outputDir).toBe('/path/to/output');
    });

    it('should accept all valid style types', () => {
      const educationalConfig: Config = {
        apiKey: 'key1',
        style: 'educational',
        outputDir: '/dir1'
      };

      const medicalConfig: Config = {
        apiKey: 'key2',
        style: 'medical',
        outputDir: '/dir2'
      };

      const colorfulConfig: Config = {
        apiKey: 'key3',
        style: 'colorful',
        outputDir: '/dir3'
      };

      expect(educationalConfig.style).toBe('educational');
      expect(medicalConfig.style).toBe('medical');
      expect(colorfulConfig.style).toBe('colorful');
    });
  });

  describe('ImageStyle type', () => {
    it('should accept all valid image style values', () => {
      const styles: ImageStyle[] = ['educational', 'medical', 'colorful'];
      
      styles.forEach(style => {
        const validStyle: ImageStyle = style;
        expect(['educational', 'medical', 'colorful']).toContain(validStyle);
      });
    });
  });

  describe('CLIOptions interface', () => {
    it('should accept empty CLIOptions object', () => {
      const options: CLIOptions = {};

      expect(options.output).toBeUndefined();
      expect(options.style).toBeUndefined();
      expect(options.dryRun).toBeUndefined();
      expect(options.verbose).toBeUndefined();
    });

    it('should accept partial CLIOptions object', () => {
      const options: CLIOptions = {
        output: '/custom/output',
        verbose: true
      };

      expect(options.output).toBe('/custom/output');
      expect(options.verbose).toBe(true);
      expect(options.style).toBeUndefined();
      expect(options.dryRun).toBeUndefined();
    });

    it('should accept complete CLIOptions object', () => {
      const options: CLIOptions = {
        output: '/complete/output',
        style: 'medical',
        dryRun: true,
        verbose: false
      };

      expect(options.output).toBe('/complete/output');
      expect(options.style).toBe('medical');
      expect(options.dryRun).toBe(true);
      expect(options.verbose).toBe(false);
    });

    it('should accept all valid style options', () => {
      const educationalOptions: CLIOptions = { style: 'educational' };
      const medicalOptions: CLIOptions = { style: 'medical' };
      const colorfulOptions: CLIOptions = { style: 'colorful' };

      expect(educationalOptions.style).toBe('educational');
      expect(medicalOptions.style).toBe('medical');
      expect(colorfulOptions.style).toBe('colorful');
    });
  });
});