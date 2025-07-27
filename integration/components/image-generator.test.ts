import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { ImageGenerator } from '@/image/generator.js';
import { APIError, NetworkError } from '@/utils/errors.js';
import { createTestOutputDir } from '../helpers/file-fixtures.js';
import { testEnv, sampleCards } from '../helpers/test-data.js';
import { server } from '../helpers/test-setup.js';
import { http, HttpResponse } from 'msw';

describe('ImageGenerator Integration Tests', () => {
  let generator: ImageGenerator;
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await createTestOutputDir();
    process.env.GEMINI_API_KEY = testEnv.validApiKey;
  });

  afterEach(async () => {
    await fs.remove(outputDir).catch(() => {});
  });

  describe('generateImage', () => {
    it('should generate image successfully with educational style', async () => {
      generator = new ImageGenerator(testEnv.validApiKey, 'educational');
      
      const card = sampleCards.vocabulary[0];
      const result = await generator.generateImage(
        card.id,
        card.question,
        card.answer,
        outputDir
      );

      expect(result.success).toBe(true);
      expect(result.imagePath).toBeDefined();
      expect(result.error).toBeUndefined();

      // Verify file was created
      if (result.imagePath) {
        expect(await fs.pathExists(result.imagePath)).toBe(true);
        
        // Verify file is in correct location
        expect(result.imagePath).toContain(outputDir);
        expect(path.extname(result.imagePath)).toBe('.png');
        
        // Verify file has content
        const stats = await fs.stat(result.imagePath);
        expect(stats.size).toBeGreaterThan(0);
      }
    });

    it('should generate images with different styles', async () => {
      const styles = ['educational', 'medical', 'colorful', 'minimal'] as const;
      const card = sampleCards.science[0];

      for (const style of styles) {
        generator = new ImageGenerator(testEnv.validApiKey, style);
        
        const result = await generator.generateImage(
          card.id,
          card.question,
          card.answer,
          outputDir
        );

        expect(result.success).toBe(true);
        expect(result.imagePath).toBeDefined();
        
        if (result.imagePath) {
          expect(await fs.pathExists(result.imagePath)).toBe(true);
          
          // Verify filename includes style or card info
          const filename = path.basename(result.imagePath);
          expect(filename).toMatch(/\.png$/);
        }
      }
    });

    it('should handle HTML content in cards', async () => {
      generator = new ImageGenerator(testEnv.validApiKey, 'educational');
      
      const card = sampleCards.htmlContent[0];
      const result = await generator.generateImage(
        card.id,
        card.question,
        card.answer,
        outputDir
      );

      expect(result.success).toBe(true);
      expect(result.imagePath).toBeDefined();
      
      // Should successfully process despite HTML tags
      if (result.imagePath) {
        expect(await fs.pathExists(result.imagePath)).toBe(true);
      }
    });

    it('should handle edge case content', async () => {
      generator = new ImageGenerator(testEnv.validApiKey, 'educational');
      
      // Test with very long content
      const longCard = sampleCards.edgeCases[2]; // Very long question
      const result = await generator.generateImage(
        longCard.id,
        longCard.question,
        longCard.answer,
        outputDir
      );

      expect(result.success).toBe(true);
      expect(result.imagePath).toBeDefined();
    });

    it('should handle unicode content', async () => {
      generator = new ImageGenerator(testEnv.validApiKey, 'educational');
      
      const unicodeCard = sampleCards.edgeCases[4]; // Unicode test
      const result = await generator.generateImage(
        unicodeCard.id,
        unicodeCard.question,
        unicodeCard.answer,
        outputDir
      );

      expect(result.success).toBe(true);
      expect(result.imagePath).toBeDefined();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      generator = new ImageGenerator(testEnv.validApiKey, 'educational');
    });

    it('should handle API authentication errors', async () => {
      // Mock 401 response
      server.use(
        http.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent', () => {
          return HttpResponse.json({
            error: {
              code: 401,
              message: 'API key not valid',
              status: 'UNAUTHENTICATED'
            }
          }, { status: 401 });
        })
      );

      const card = sampleCards.vocabulary[0];
      const result = await generator.generateImage(
        card.id,
        card.question,
        card.answer,
        outputDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key not valid');
      expect(result.imagePath).toBeUndefined();
    });

    it('should handle rate limiting with proper retry', async () => {
      let callCount = 0;
      
      // Mock rate limit on first call, success on second
      server.use(
        http.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent', () => {
          callCount++;
          
          if (callCount === 1) {
            return new HttpResponse(null, {
              status: 429,
              statusText: 'Too Many Requests',
              headers: { 'Retry-After': '1' }
            });
          }
          
          // Success on retry
          return HttpResponse.json({
            candidates: [{
              content: {
                parts: [{
                  inlineData: {
                    mimeType: 'image/png',
                    data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
                  }
                }]
              }
            }]
          });
        })
      );

      const card = sampleCards.vocabulary[0];
      const result = await generator.generateImage(
        card.id,
        card.question,
        card.answer,
        outputDir
      );

      expect(callCount).toBeGreaterThan(1); // Should have retried
      expect(result.success).toBe(true);
      expect(result.imagePath).toBeDefined();
    });

    it('should handle network timeouts', async () => {
      // Mock slow response that exceeds timeout
      server.use(
        http.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent', async () => {
          await new Promise(resolve => setTimeout(resolve, 35000)); // Longer than 30s timeout
          return HttpResponse.json({ success: true });
        })
      );

      const card = sampleCards.vocabulary[0];
      const result = await generator.generateImage(
        card.id,
        card.question,
        card.answer,
        outputDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should handle server errors (500)', async () => {
      server.use(
        http.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent', () => {
          return new HttpResponse(null, {
            status: 500,
            statusText: 'Internal Server Error'
          });
        })
      );

      const card = sampleCards.vocabulary[0];
      const result = await generator.generateImage(
        card.id,
        card.question,
        card.answer,
        outputDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should handle malformed API responses', async () => {
      server.use(
        http.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent', () => {
          return HttpResponse.json({
            // Missing expected structure
            invalidResponse: true
          });
        })
      );

      const card = sampleCards.vocabulary[0];
      const result = await generator.generateImage(
        card.id,
        card.question,
        card.answer,
        outputDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle file system errors', async () => {
      const card = sampleCards.vocabulary[0];
      
      // Try to write to a non-existent directory
      const invalidOutputDir = path.join(outputDir, 'non-existent', 'deeply', 'nested');
      
      const result = await generator.generateImage(
        card.id,
        card.question,
        card.answer,
        invalidOutputDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('file management', () => {
    beforeEach(() => {
      generator = new ImageGenerator(testEnv.validApiKey, 'educational');
    });

    it('should create unique filenames for different cards', async () => {
      const cards = sampleCards.vocabulary;
      const generatedFiles: string[] = [];

      for (const card of cards) {
        const result = await generator.generateImage(
          card.id,
          card.question,
          card.answer,
          outputDir
        );

        expect(result.success).toBe(true);
        if (result.imagePath) {
          generatedFiles.push(result.imagePath);
        }
      }

      // All filenames should be unique
      const uniqueFilenames = new Set(generatedFiles.map(f => path.basename(f)));
      expect(uniqueFilenames.size).toBe(cards.length);
    });

    it('should handle existing files gracefully', async () => {
      const card = sampleCards.vocabulary[0];
      
      // Generate image first time
      const result1 = await generator.generateImage(
        card.id,
        card.question,
        card.answer,
        outputDir
      );
      
      expect(result1.success).toBe(true);
      const firstPath = result1.imagePath;

      // Generate image second time (should create different file or overwrite)
      const result2 = await generator.generateImage(
        card.id,
        card.question,
        card.answer,
        outputDir
      );

      expect(result2.success).toBe(true);
      expect(result2.imagePath).toBeDefined();
      
      // Both files should exist or one should have been overwritten
      if (firstPath && result2.imagePath) {
        if (firstPath === result2.imagePath) {
          // Overwritten - file should still exist
          expect(await fs.pathExists(firstPath)).toBe(true);
        } else {
          // Different files - both should exist
          expect(await fs.pathExists(firstPath)).toBe(true);
          expect(await fs.pathExists(result2.imagePath)).toBe(true);
        }
      }
    });
  });

  describe('performance', () => {
    beforeEach(() => {
      generator = new ImageGenerator(testEnv.validApiKey, 'educational');
    });

    it('should complete image generation within reasonable time', async () => {
      const card = sampleCards.vocabulary[0];
      const startTime = Date.now();

      const result = await generator.generateImage(
        card.id,
        card.question,
        card.answer,
        outputDir
      );

      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle concurrent requests efficiently', async () => {
      const cards = sampleCards.vocabulary;
      const startTime = Date.now();

      // Generate images concurrently
      const promises = cards.map(card =>
        generator.generateImage(
          card.id,
          card.question,
          card.answer,
          outputDir
        )
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // All should succeed
      for (const result of results) {
        expect(result.success).toBe(true);
      }

      // Concurrent execution should be faster than sequential
      expect(duration).toBeLessThan(cards.length * 5000);
    });
  });
});