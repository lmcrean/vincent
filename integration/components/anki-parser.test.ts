import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { AnkiParser } from '@/anki/parser.js';
import { FileError } from '@/utils/errors.js';
import { createTestApkg, validateApkgContent, createTestOutputDir } from '../helpers/file-fixtures.js';
import { sampleCards } from '../helpers/test-data.js';

describe('AnkiParser Integration Tests', () => {
  let parser: AnkiParser;
  let tempOutputDir: string;

  beforeEach(async () => {
    parser = new AnkiParser();
    tempOutputDir = await createTestOutputDir();
  });

  afterEach(async () => {
    await parser.cleanup();
    await fs.remove(tempOutputDir).catch(() => {});
  });

  describe('parseApkg', () => {
    it('should parse a basic vocabulary deck correctly', async () => {
      // Create test .txt file
      const apkgPath = await createTestApkg({
        deckName: 'Vocabulary Test',
        cards: sampleCards.vocabulary
      });

      // Parse the deck
      const deck = await parser.parseApkg(apkgPath);

      // Verify deck structure
      expect(deck.name).toBe('Vocabulary Test');
      expect(deck.cards).toHaveLength(3);
      expect(deck.mediaFiles).toBeDefined();

      // Verify card content
      const firstCard = deck.cards[0];
      expect(firstCard.question).toBe('What is the capital of France?');
      expect(firstCard.answer).toBe('Paris');
      expect(firstCard.id).toBeDefined();
      expect(firstCard.nid).toBeDefined();

      // Verify all cards are present
      const questions = deck.cards.map(card => card.question);
      expect(questions).toContain('What is the capital of France?');
      expect(questions).toContain('What does "bonjour" mean in English?');
      expect(questions).toContain('What is the French word for "cat"?');
    });

    it('should handle deck with HTML content', async () => {
      const apkgPath = await createTestApkg({
        deckName: 'HTML Content Test',
        cards: sampleCards.htmlContent
      });

      const deck = await parser.parseApkg(apkgPath);

      expect(deck.cards).toHaveLength(2);
      
      const firstCard = deck.cards[0];
      // HTML should be stripped by the parser
      expect(firstCard.question).toBe('What is photosynthesis?');
      expect(firstCard.answer).toBe('The process by which plants convert light energy into chemical energy.');
    });

    it('should handle deck with existing media files', async () => {
      const mediaFiles = new Map([
        ['test-image.png', Buffer.from('fake-png-data')],
        ['audio-file.mp3', Buffer.from('fake-mp3-data')]
      ]);

      const apkgPath = await createTestApkg({
        deckName: 'Media Test Deck',
        cards: sampleCards.single,
        mediaFiles
      });

      const deck = await parser.parseApkg(apkgPath);

      expect(deck.cards).toHaveLength(1);
      expect(deck.mediaFiles).toBeDefined();
      expect(deck.mediaFiles.size).toBe(2);
    });

    it('should handle edge case content', async () => {
      const apkgPath = await createTestApkg({
        deckName: 'Edge Cases',
        cards: sampleCards.edgeCases
      });

      const deck = await parser.parseApkg(apkgPath);

      expect(deck.cards).toHaveLength(5);
      
      // Test empty question
      const emptyQuestionCard = deck.cards.find(card => card.question === '');
      expect(emptyQuestionCard).toBeDefined();
      expect(emptyQuestionCard?.answer).toBe('Empty question test');

      // Test empty answer
      const emptyAnswerCard = deck.cards.find(card => card.answer === '');
      expect(emptyAnswerCard).toBeDefined();
      expect(emptyAnswerCard?.question).toBe('Empty answer test');

      // Test unicode content
      const unicodeCard = deck.cards.find(card => card.question.includes('éñ中文🎯'));
      expect(unicodeCard).toBeDefined();
      expect(unicodeCard?.answer).toBe('Unicode test ✅');
    });

    it('should handle large deck efficiently', async () => {
      const startTime = Date.now();
      
      const apkgPath = await createTestApkg({
        deckName: 'Large Deck Test',
        cards: sampleCards.large
      });

      const deck = await parser.parseApkg(apkgPath);
      
      const processingTime = Date.now() - startTime;

      expect(deck.cards).toHaveLength(50);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify cards are in correct order
      for (let i = 0; i < 50; i++) {
        const card = deck.cards[i];
        expect(card.question).toContain(`Question ${i + 1}`);
        expect(card.answer).toBe(`Answer ${i + 1}`);
      }
    });

    it('should throw FileError for non-existent file', async () => {
      const nonExistentPath = path.join(tempOutputDir, 'does-not-exist.txt');
      
      await expect(parser.parseApkg(nonExistentPath))
        .rejects
        .toThrow(FileError);
    });

    it('should throw FileError for invalid .txt file', async () => {
      // Create a file that's not a valid .txt
      const invalidPath = path.join(tempOutputDir, 'invalid.txt');
      await fs.writeFile(invalidPath, 'not a zip file');
      
      await expect(parser.parseApkg(invalidPath))
        .rejects
        .toThrow(FileError);
    });

    it('should throw FileError for .txt without collection.anki2', async () => {
      // Create a zip file without the required database
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip();
      zip.addFile('random-file.txt', Buffer.from('content'));
      
      const invalidPath = path.join(tempOutputDir, 'no-collection.txt');
      zip.writeZip(invalidPath);
      
      await expect(parser.parseApkg(invalidPath))
        .rejects
        .toThrow(FileError);
      await expect(parser.parseApkg(invalidPath))
        .rejects
        .toThrow('missing collection.anki2');
    });
  });

  describe('cleanup', () => {
    it('should clean up temporary files after parsing', async () => {
      const apkgPath = await createTestApkg({
        deckName: 'Cleanup Test',
        cards: sampleCards.single
      });

      await parser.parseApkg(apkgPath);
      
      // Verify temp directory exists before cleanup
      const tempDir = (parser as any).tempDir;
      expect(tempDir).toBeDefined();
      expect(await fs.pathExists(tempDir)).toBe(true);

      // Clean up
      await parser.cleanup();

      // Verify temp directory is removed
      expect(await fs.pathExists(tempDir)).toBe(false);
    });

    it('should handle cleanup when no temp directory exists', async () => {
      // Should not throw when cleaning up without prior parsing
      await expect(parser.cleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup errors gracefully', async () => {
      const apkgPath = await createTestApkg({
        deckName: 'Cleanup Error Test',
        cards: sampleCards.single
      });

      await parser.parseApkg(apkgPath);
      
      // Manually remove temp directory to simulate cleanup error
      const tempDir = (parser as any).tempDir;
      await fs.remove(tempDir);

      // Should not throw even if cleanup fails
      await expect(parser.cleanup()).resolves.not.toThrow();
    });
  });

  describe('memory management', () => {
    it('should handle multiple parse operations without memory leaks', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Parse multiple decks
      for (let i = 0; i < 5; i++) {
        const apkgPath = await createTestApkg({
          deckName: `Memory Test ${i}`,
          cards: sampleCards.vocabulary
        });

        const deck = await parser.parseApkg(apkgPath);
        expect(deck.cards).toHaveLength(3);
        
        await parser.cleanup();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});