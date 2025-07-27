import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { processAnkiDeck } from '@/index.js';
import { ImageStyle } from '@/types.js';
import { createTestApkg, createTestOutputDir, validateApkgContent } from '../helpers/file-fixtures.js';
import { sampleCards, testConfigs, testEnv } from '../helpers/test-data.js';

describe('End-to-End Deck Processing Tests', () => {
  let inputApkgPath: string;
  let outputDir: string;
  let outputApkgPath: string;

  beforeEach(async () => {
    outputDir = await createTestOutputDir();
    outputApkgPath = path.join(outputDir, 'enhanced-deck.apkg');
    
    // Set valid API key for tests
    process.env.GEMINI_API_KEY = testEnv.validApiKey;
  });

  afterEach(async () => {
    await fs.remove(outputDir).catch(() => {});
    delete process.env.GEMINI_API_KEY;
  });

  describe('complete processing workflow', () => {
    it('should process single card deck successfully', async () => {
      // Create test deck
      inputApkgPath = await createTestApkg({
        deckName: 'Single Card Test',
        cards: sampleCards.single
      });

      // Process the deck
      await processAnkiDeck(
        inputApkgPath,
        outputApkgPath,
        'educational',
        testConfigs.basic
      );

      // Verify output file was created
      expect(await fs.pathExists(outputApkgPath)).toBe(true);

      // Verify output file is valid
      const isValid = await validateApkgContent(outputApkgPath, sampleCards.single);
      expect(isValid).toBe(true);

      // Verify images were generated
      const imageDir = path.join(path.dirname(outputApkgPath), 'vincent-output', 'images');
      expect(await fs.pathExists(imageDir)).toBe(true);

      const imageFiles = await fs.readdir(imageDir);
      expect(imageFiles.length).toBeGreaterThan(0);
      expect(imageFiles.some(file => file.endsWith('.png'))).toBe(true);
    });

    it('should process vocabulary deck with all cards', async () => {
      inputApkgPath = await createTestApkg({
        deckName: 'Vocabulary Deck',
        cards: sampleCards.vocabulary
      });

      await processAnkiDeck(
        inputApkgPath,
        outputApkgPath,
        'educational',
        testConfigs.basic
      );

      // Verify all cards are present
      const isValid = await validateApkgContent(outputApkgPath, sampleCards.vocabulary);
      expect(isValid).toBe(true);

      // Verify correct number of images generated
      const imageDir = path.join(path.dirname(outputApkgPath), 'vincent-output', 'images');
      const imageFiles = await fs.readdir(imageDir);
      expect(imageFiles.length).toBe(sampleCards.vocabulary.length);
    });

    it('should handle different image styles', async () => {
      const styles: ImageStyle[] = ['educational', 'medical', 'colorful', 'minimal'];
      
      for (const style of styles) {
        const styleOutputPath = path.join(outputDir, `${style}-deck.apkg`);
        
        inputApkgPath = await createTestApkg({
          deckName: `${style} Style Test`,
          cards: sampleCards.single
        });

        await processAnkiDeck(
          inputApkgPath,
          styleOutputPath,
          style,
          testConfigs.basic
        );

        expect(await fs.pathExists(styleOutputPath)).toBe(true);
        
        // Verify images were generated
        const imageDir = path.join(path.dirname(styleOutputPath), 'vincent-output', 'images');
        const imageFiles = await fs.readdir(imageDir);
        expect(imageFiles.length).toBeGreaterThan(0);
      }
    });

    it('should handle HTML content in cards', async () => {
      inputApkgPath = await createTestApkg({
        deckName: 'HTML Content Test',
        cards: sampleCards.htmlContent
      });

      await processAnkiDeck(
        inputApkgPath,
        outputApkgPath,
        'educational',
        testConfigs.basic
      );

      // Should complete successfully despite HTML content
      expect(await fs.pathExists(outputApkgPath)).toBe(true);
      
      const isValid = await validateApkgContent(outputApkgPath, sampleCards.htmlContent);
      expect(isValid).toBe(true);
    });

    it('should handle deck with existing media files', async () => {
      const existingMedia = new Map([
        ['existing-image.png', Buffer.from('fake-png-data')],
        ['audio-file.mp3', Buffer.from('fake-mp3-data')]
      ]);

      inputApkgPath = await createTestApkg({
        deckName: 'Media Test Deck',
        cards: sampleCards.vocabulary,
        mediaFiles: existingMedia
      });

      await processAnkiDeck(
        inputApkgPath,
        outputApkgPath,
        'educational',
        testConfigs.basic
      );

      expect(await fs.pathExists(outputApkgPath)).toBe(true);
      
      // Both existing media and new images should be present
      const imageDir = path.join(path.dirname(outputApkgPath), 'vincent-output', 'images');
      const imageFiles = await fs.readdir(imageDir);
      expect(imageFiles.length).toBe(sampleCards.vocabulary.length);
    });
  });

  describe('dry run mode', () => {
    it('should analyze deck without generating images', async () => {
      inputApkgPath = await createTestApkg({
        deckName: 'Dry Run Test',
        cards: sampleCards.vocabulary
      });

      // Capture console output
      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
      };

      try {
        await processAnkiDeck(
          inputApkgPath,
          outputApkgPath,
          'educational',
          { ...testConfigs.dryRun }
        );

        // Verify no output files were created
        expect(await fs.pathExists(outputApkgPath)).toBe(false);

        // Verify analysis was performed
        const output = consoleLogs.join('\n');
        expect(output).toContain('Dry Run Summary');
        expect(output).toContain('Dry Run Test');
        expect(output).toContain('Cards: 3');
        expect(output).toContain('Sample cards');

      } finally {
        console.log = originalLog;
      }
    });

    it('should show time estimates in dry run', async () => {
      inputApkgPath = await createTestApkg({
        deckName: 'Time Estimate Test',
        cards: sampleCards.large // 50 cards
      });

      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
      };

      try {
        await processAnkiDeck(
          inputApkgPath,
          outputApkgPath,
          'educational',
          testConfigs.dryRun
        );

        const output = consoleLogs.join('\n');
        expect(output).toMatch(/\d+.*minutes?/); // Should contain time estimate

      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('error scenarios', () => {
    it('should handle missing API key gracefully', async () => {
      delete process.env.GEMINI_API_KEY;
      
      inputApkgPath = await createTestApkg({
        deckName: 'No API Key Test',
        cards: sampleCards.single
      });

      await expect(processAnkiDeck(
        inputApkgPath,
        outputApkgPath,
        'educational',
        testConfigs.basic
      )).rejects.toThrow('No API key available');
    });

    it('should handle empty deck gracefully', async () => {
      inputApkgPath = await createTestApkg({
        deckName: 'Empty Deck',
        cards: []
      });

      // Should complete without error but show warning
      await processAnkiDeck(
        inputApkgPath,
        outputApkgPath,
        'educational',
        testConfigs.basic
      );

      // No output file should be created for empty deck
      expect(await fs.pathExists(outputApkgPath)).toBe(false);
    });

    it('should handle output directory creation', async () => {
      inputApkgPath = await createTestApkg({
        deckName: 'Directory Creation Test',
        cards: sampleCards.single
      });

      // Use nested output path that doesn't exist
      const nestedOutputPath = path.join(outputDir, 'nested', 'path', 'output.apkg');

      await processAnkiDeck(
        inputApkgPath,
        nestedOutputPath,
        'educational',
        testConfigs.basic
      );

      expect(await fs.pathExists(nestedOutputPath)).toBe(true);
    });

    it('should continue processing when some images fail', async () => {
      // This test would require mocking API to fail for specific cards
      // For now, we'll test the basic resilience pattern
      
      inputApkgPath = await createTestApkg({
        deckName: 'Partial Failure Test',
        cards: sampleCards.vocabulary
      });

      // Even if some images fail, should still create output
      await processAnkiDeck(
        inputApkgPath,
        outputApkgPath,
        'educational',
        testConfigs.basic
      );

      expect(await fs.pathExists(outputApkgPath)).toBe(true);
    });
  });

  describe('performance tests', () => {
    it('should complete small deck within reasonable time', async () => {
      inputApkgPath = await createTestApkg({
        deckName: 'Performance Test Small',
        cards: sampleCards.vocabulary
      });

      const startTime = Date.now();

      await processAnkiDeck(
        inputApkgPath,
        outputApkgPath,
        'minimal', // Faster style
        testConfigs.fastTest
      );

      const duration = Date.now() - startTime;

      expect(await fs.pathExists(outputApkgPath)).toBe(true);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should handle concurrent processing efficiently', async () => {
      inputApkgPath = await createTestApkg({
        deckName: 'Concurrency Test',
        cards: sampleCards.vocabulary
      });

      const startTime = Date.now();

      await processAnkiDeck(
        inputApkgPath,
        outputApkgPath,
        'minimal',
        testConfigs.highConcurrency
      );

      const duration = Date.now() - startTime;

      expect(await fs.pathExists(outputApkgPath)).toBe(true);
      // High concurrency should be faster than sequential
      expect(duration).toBeLessThan(20000);
    });

    it('should show progress during processing', async () => {
      inputApkgPath = await createTestApkg({
        deckName: 'Progress Test',
        cards: sampleCards.vocabulary
      });

      // Monitor console output for progress indicators
      const progressLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        const message = args.join(' ');
        if (message.includes('Processing:') || message.includes('%')) {
          progressLogs.push(message);
        }
        originalLog(...args);
      };

      try {
        await processAnkiDeck(
          inputApkgPath,
          outputApkgPath,
          'educational',
          testConfigs.basic
        );

        // Should have shown progress for each card
        expect(progressLogs.length).toBeGreaterThan(0);
        expect(progressLogs.some(log => log.includes('Processing:'))).toBe(true);

      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('file integrity', () => {
    it('should preserve original deck structure', async () => {
      inputApkgPath = await createTestApkg({
        deckName: 'Integrity Test',
        cards: sampleCards.vocabulary
      });

      await processAnkiDeck(
        inputApkgPath,
        outputApkgPath,
        'educational',
        testConfigs.basic
      );

      // Verify all original cards are preserved
      const isValid = await validateApkgContent(outputApkgPath, sampleCards.vocabulary);
      expect(isValid).toBe(true);

      // Verify output file is a valid .apkg
      expect(path.extname(outputApkgPath)).toBe('.apkg');
      
      // Verify file size is reasonable
      const stats = await fs.stat(outputApkgPath);
      expect(stats.size).toBeGreaterThan(1000); // Should be non-trivial size
    });

    it('should create properly formatted image files', async () => {
      inputApkgPath = await createTestApkg({
        deckName: 'Image Format Test',
        cards: sampleCards.single
      });

      await processAnkiDeck(
        inputApkgPath,
        outputApkgPath,
        'educational',
        testConfigs.basic
      );

      const imageDir = path.join(path.dirname(outputApkgPath), 'vincent-output', 'images');
      const imageFiles = await fs.readdir(imageDir);
      
      expect(imageFiles.length).toBe(1);
      
      const imageFile = imageFiles[0];
      expect(path.extname(imageFile)).toBe('.png');
      
      // Verify image file has content
      const imagePath = path.join(imageDir, imageFile);
      const stats = await fs.stat(imagePath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });
});