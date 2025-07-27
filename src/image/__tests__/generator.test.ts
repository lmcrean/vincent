import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { tmpdir } from 'os';
import axios from 'axios';
import { ImageGenerator } from '../generator.js';
import { APIError, NetworkError } from '../../utils/errors.js';
import { PromptGenerator } from '../prompt.js';

// Mock dependencies
vi.mock('axios');
vi.mock('../prompt.js');

describe('ImageGenerator', () => {
  let generator: ImageGenerator;
  let outputDir: string;
  let mockAxios: any;
  let mockPromptGenerator: any;
  let originalEnv: any;

  beforeEach(async () => {
    // Save original environment
    originalEnv = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-api-key-123';

    // Create temp output directory
    outputDir = path.join(tmpdir(), 'vincent-generator-test-' + Date.now());
    await fs.ensureDir(outputDir);

    // Mock axios
    mockAxios = {
      create: vi.fn().mockReturnThis(),
      post: vi.fn()
    };
    vi.mocked(axios.create).mockReturnValue(mockAxios);

    // Mock PromptGenerator
    mockPromptGenerator = {
      generatePrompt: vi.fn().mockReturnValue('Generate an educational illustration')
    };
    vi.mocked(PromptGenerator).mockImplementation(() => mockPromptGenerator);

    generator = new ImageGenerator('test-api-key', 'educational');
  });

  afterEach(async () => {
    // Restore environment
    if (originalEnv !== undefined) {
      process.env.GEMINI_API_KEY = originalEnv;
    } else {
      delete process.env.GEMINI_API_KEY;
    }

    try {
      await fs.remove(outputDir);
    } catch {
      // Ignore cleanup errors
    }
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create ImageGenerator with correct configuration', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(PromptGenerator).toHaveBeenCalledWith('educational');
    });

    it('should work with different image styles', () => {
      new ImageGenerator('test-key', 'medical');
      expect(PromptGenerator).toHaveBeenCalledWith('medical');

      new ImageGenerator('test-key', 'colorful');
      expect(PromptGenerator).toHaveBeenCalledWith('colorful');
    });
  });

  describe('generateImage', () => {
    beforeEach(() => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: Buffer.from('mock-image-data')
      });
    });

    it('should successfully generate and save image', async () => {
      const result = await generator.generateImage(
        123,
        'What is photosynthesis?',
        'The process by which plants convert light into energy',
        outputDir
      );

      expect(result.success).toBe(true);
      expect(result.cardId).toBe(123);
      expect(result.imagePath).toMatch(/card-123\.png$/);
      expect(result.error).toBeUndefined();

      // Verify file was created
      const imageExists = await fs.pathExists(result.imagePath!);
      expect(imageExists).toBe(true);

      // Verify file content
      const savedContent = await fs.readFile(result.imagePath!);
      expect(savedContent.toString()).toBe('mock-image-data');
    });

    it('should call prompt generator with correct parameters', async () => {
      await generator.generateImage(
        456,
        'What is DNA?',
        'Deoxyribonucleic acid',
        outputDir
      );

      expect(mockPromptGenerator.generatePrompt).toHaveBeenCalledWith(
        'What is DNA?',
        'Deoxyribonucleic acid'
      );
    });

    it('should make API request with correct parameters', async () => {
      await generator.generateImage(
        789,
        'Test question',
        'Test answer',
        outputDir
      );

      expect(mockAxios.post).toHaveBeenCalledWith(
        '/models/gemini-2.0-flash-preview-image-generation:generateContent',
        {
          contents: [{
            parts: [{
              text: 'Generate an educational illustration'
            }]
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 1,
            responseMimeType: "image/png"
          }
        },
        {
          params: {
            key: 'test-api-key-123'
          },
          responseType: 'arraybuffer'
        }
      );
    });

    it('should format card ID with leading zeros in filename', async () => {
      const result = await generator.generateImage(
        7,
        'Question',
        'Answer',
        outputDir
      );

      expect(result.imagePath).toMatch(/card-007\.png$/);
    });

    it('should create output directory if it does not exist', async () => {
      const newOutputDir = path.join(outputDir, 'new-subdir');
      
      const result = await generator.generateImage(
        1,
        'Question',
        'Answer',
        newOutputDir
      );

      expect(result.success).toBe(true);
      
      const dirExists = await fs.pathExists(newOutputDir);
      expect(dirExists).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle API errors and return failure result', async () => {
      mockAxios.post.mockRejectedValue(new APIError('API request failed'));

      const result = await generator.generateImage(
        1,
        'Question',
        'Answer',
        outputDir
      );

      expect(result.success).toBe(false);
      expect(result.cardId).toBe(1);
      expect(result.error).toBe('API request failed');
      expect(result.imagePath).toBeUndefined();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      (networkError as any).code = 'ENOTFOUND';
      (networkError as any).isAxiosError = true;
      
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      mockAxios.post.mockRejectedValue(networkError);

      const result = await generator.generateImage(
        1,
        'Question',
        'Answer',
        outputDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not connect to image generation service');
    });

    it('should handle 401 unauthorized error', async () => {
      const authError = {
        isAxiosError: true,
        response: { status: 401 },
        message: 'Unauthorized'
      };
      
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      mockAxios.post.mockRejectedValue(authError);

      const result = await generator.generateImage(
        1,
        'Question',
        'Answer',
        outputDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should handle 429 rate limit error', async () => {
      const rateLimitError = {
        isAxiosError: true,
        response: { status: 429 },
        message: 'Too Many Requests'
      };
      
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      mockAxios.post.mockRejectedValue(rateLimitError);

      const result = await generator.generateImage(
        1,
        'Question',
        'Answer',
        outputDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded. Please try again later.');
    });

    it('should handle 403 quota exceeded error', async () => {
      const quotaError = {
        isAxiosError: true,
        response: { status: 403 },
        message: 'Forbidden'
      };
      
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      mockAxios.post.mockRejectedValue(quotaError);

      const result = await generator.generateImage(
        1,
        'Question',
        'Answer',
        outputDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('API quota exceeded');
    });

    it('should handle non-200 response status', async () => {
      mockAxios.post.mockResolvedValue({
        status: 500,
        data: 'Internal Server Error'
      });

      const result = await generator.generateImage(
        1,
        'Question',
        'Answer',
        outputDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('API request failed with status 500');
    });

    it('should handle file system errors', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: Buffer.from('mock-image-data')
      });

      // Mock fs.writeFile to throw an error
      vi.spyOn(fs, 'writeFile').mockRejectedValue(new Error('Disk full'));

      const result = await generator.generateImage(
        1,
        'Question',
        'Answer',
        outputDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Disk full');
    });

    it('should handle missing API key', async () => {
      delete process.env.GEMINI_API_KEY;
      
      const result = await generator.generateImage(
        1,
        'Question',
        'Answer',
        outputDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('GEMINI_API_KEY environment variable not set');
    });

    it('should handle unknown errors', async () => {
      mockAxios.post.mockRejectedValue('Unexpected error type');

      const result = await generator.generateImage(
        1,
        'Question',
        'Answer',
        outputDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('integration scenarios', () => {
    it('should handle large image data', async () => {
      const largeImageData = Buffer.alloc(1024 * 1024); // 1MB of zeros
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: largeImageData
      });

      const result = await generator.generateImage(
        1,
        'Question',
        'Answer',
        outputDir
      );

      expect(result.success).toBe(true);
      
      const savedContent = await fs.readFile(result.imagePath!);
      expect(savedContent.length).toBe(largeImageData.length);
    });

    it('should handle special characters in filenames', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: Buffer.from('mock-image-data')
      });

      const result = await generator.generateImage(
        999999,
        'Question with special chars: <>&"\'',
        'Answer with symbols: @#$%',
        outputDir
      );

      expect(result.success).toBe(true);
      expect(result.imagePath).toMatch(/card-999999\.png$/);
      
      const imageExists = await fs.pathExists(result.imagePath!);
      expect(imageExists).toBe(true);
    });

    it('should handle concurrent image generation', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: Buffer.from('mock-image-data')
      });

      const promises = [
        generator.generateImage(1, 'Q1', 'A1', outputDir),
        generator.generateImage(2, 'Q2', 'A2', outputDir),
        generator.generateImage(3, 'Q3', 'A3', outputDir)
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.cardId).toBe(index + 1);
      });

      // Verify all files were created
      for (let i = 1; i <= 3; i++) {
        const filePath = path.join(outputDir, `card-00${i}.png`);
        const exists = await fs.pathExists(filePath);
        expect(exists).toBe(true);
      }
    });
  });
});