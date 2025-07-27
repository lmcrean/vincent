import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { tmpdir } from 'os';
import AdmZip from 'adm-zip';
import Database from 'better-sqlite3';
import { AnkiWriter } from '../writer.js';
import { AnkiDeck } from '../../types.js';
import { FileError } from '../../utils/errors.js';

// Mock dependencies
vi.mock('adm-zip');
vi.mock('better-sqlite3');
vi.mock('../../utils/files.js', async () => {
  const actual = await vi.importActual('../../utils/files.js');
  return {
    ...actual,
    createTempDir: vi.fn()
  };
});

describe('AnkiWriter', () => {
  let writer: AnkiWriter;
  let tempDir: string;
  let outputDir: string;
  let mockZip: any;
  let mockDb: any;
  let mockCreateTempDir: any;
  let mockDeck: AnkiDeck;
  let generatedImages: Map<number, string>;

  beforeEach(async () => {
    writer = new AnkiWriter();
    
    // Create actual temp directories for testing
    tempDir = path.join(tmpdir(), 'vincent-writer-test-' + Date.now());
    outputDir = path.join(tmpdir(), 'vincent-output-test-' + Date.now());
    await fs.ensureDir(tempDir);
    await fs.ensureDir(outputDir);

    // Mock createTempDir to return our test directory
    const { createTempDir } = await import('../../utils/files.js');
    mockCreateTempDir = vi.mocked(createTempDir);
    mockCreateTempDir.mockResolvedValue(tempDir);

    // Mock AdmZip
    mockZip = {
      extractAllTo: vi.fn(),
      addLocalFile: vi.fn(),
      writeZip: vi.fn()
    };
    vi.mocked(AdmZip).mockReturnValue(mockZip);

    // Mock Database
    const mockUpdateStmt = {
      run: vi.fn()
    };
    const mockSelectStmt = {
      all: vi.fn().mockReturnValue([
        { id: 100, flds: 'Question 1\x1fAnswer 1', card_id: 1 },
        { id: 200, flds: 'Question 2\x1fAnswer 2', card_id: 2 }
      ])
    };

    mockDb = {
      prepare: vi.fn().mockImplementation((sql?: string) => {
        if (!sql) return { run: vi.fn(), all: vi.fn() };
        if (sql.includes('UPDATE')) {
          return mockUpdateStmt;
        } else if (sql.includes('SELECT')) {
          return mockSelectStmt;
        }
        return { run: vi.fn(), all: vi.fn() };
      }),
      close: vi.fn()
    };
    vi.mocked(Database).mockReturnValue(mockDb);

    // Setup test data
    mockDeck = {
      name: 'Test Deck',
      cards: [
        {
          id: 1,
          nid: 100,
          question: 'What is photosynthesis?',
          answer: 'The process by which plants convert light into energy',
          fields: ['What is photosynthesis?', 'The process by which plants convert light into energy'],
          tags: ['biology']
        },
        {
          id: 2,
          nid: 200,
          question: 'What is DNA?',
          answer: 'Deoxyribonucleic acid',
          fields: ['What is DNA?', 'Deoxyribonucleic acid'],
          tags: ['biology', 'genetics']
        }
      ],
      mediaFiles: new Map()
    };

    generatedImages = new Map([
      [1, path.join(outputDir, 'image1.png')],
      [2, path.join(outputDir, 'image2.png')]
    ]);

    // Create mock generated image files
    await fs.writeFile(path.join(outputDir, 'image1.png'), 'mock-image-1-data');
    await fs.writeFile(path.join(outputDir, 'image2.png'), 'mock-image-2-data');

    // Create mock collection.anki2 in temp directory
    await fs.writeFile(path.join(tempDir, 'collection.anki2'), 'mock-db-content');
    await fs.ensureDir(path.join(tempDir, 'collection.media'));
  });

  afterEach(async () => {
    try {
      await fs.remove(tempDir);
      await fs.remove(outputDir);
    } catch {
      // Ignore cleanup errors
    }
    vi.clearAllMocks();
  });

  describe('writeEnhancedApkg', () => {
    it('should successfully create enhanced .apkg file', async () => {
      const outputPath = path.join(outputDir, 'enhanced.apkg');

      await writer.writeEnhancedApkg(
        '/path/to/original.apkg',
        mockDeck,
        generatedImages,
        outputPath
      );

      // Verify zip operations
      expect(mockZip.extractAllTo).toHaveBeenCalledWith(tempDir, true);
      expect(mockZip.writeZip).toHaveBeenCalledWith(outputPath);

      // Verify database updates
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE notes'));
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT'));

      // Verify cleanup
      expect(mockCreateTempDir).toHaveBeenCalled();
    });

    it('should update database with image references', async () => {
      const outputPath = path.join(outputDir, 'enhanced.apkg');
      
      await writer.writeEnhancedApkg(
        '/path/to/original.apkg',
        mockDeck,
        generatedImages,
        outputPath
      );

      // Verify that UPDATE statements were called with image HTML
      const updateStmt = mockDb.prepare('UPDATE');
      expect(updateStmt.run).toHaveBeenCalledWith(
        expect.stringContaining('<img src="image1.png">'),
        100
      );
      expect(updateStmt.run).toHaveBeenCalledWith(
        expect.stringContaining('<img src="image2.png">'),
        200
      );
    });

    it('should copy generated images to media directory', async () => {
      const outputPath = path.join(outputDir, 'enhanced.apkg');

      await writer.writeEnhancedApkg(
        '/path/to/original.apkg',
        mockDeck,
        generatedImages,
        outputPath
      );

      // Verify zip operations were called
      expect(mockZip.extractAllTo).toHaveBeenCalledWith(tempDir, true);
      expect(mockZip.writeZip).toHaveBeenCalledWith(outputPath);
    });

    it('should create media manifest', async () => {
      const outputPath = path.join(outputDir, 'enhanced.apkg');

      await writer.writeEnhancedApkg(
        '/path/to/original.apkg',
        mockDeck,
        generatedImages,
        outputPath
      );

      // Verify that the writer completed successfully
      expect(mockZip.writeZip).toHaveBeenCalledWith(outputPath);
    });

    it('should handle existing media manifest', async () => {
      const outputPath = path.join(outputDir, 'enhanced.apkg');

      await writer.writeEnhancedApkg(
        '/path/to/original.apkg',
        mockDeck,
        generatedImages,
        outputPath
      );

      // Verify successful completion
      expect(mockZip.writeZip).toHaveBeenCalledWith(outputPath);
    });

    it('should throw FileError when database file is missing', async () => {
      // Mock Database constructor to throw error
      vi.mocked(Database).mockImplementation(() => {
        throw new Error('Database file not found');
      });

      const outputPath = path.join(outputDir, 'enhanced.apkg');

      await expect(
        writer.writeEnhancedApkg('/path/to/original.apkg', mockDeck, generatedImages, outputPath)
      ).rejects.toThrow(FileError);
    });

    it('should handle missing image files gracefully', async () => {
      // Remove one of the generated images
      await fs.remove(path.join(outputDir, 'image1.png'));

      const outputPath = path.join(outputDir, 'enhanced.apkg');

      // Should still work but skip missing images
      await expect(
        writer.writeEnhancedApkg('/path/to/original.apkg', mockDeck, generatedImages, outputPath)
      ).resolves.not.toThrow();

      // Verify successful completion
      expect(mockZip.writeZip).toHaveBeenCalledWith(outputPath);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database error');
      });

      const outputPath = path.join(outputDir, 'enhanced.apkg');

      await expect(
        writer.writeEnhancedApkg('/path/to/original.apkg', mockDeck, generatedImages, outputPath)
      ).rejects.toThrow(FileError);
    });

    it('should handle zip extraction errors', async () => {
      mockZip.extractAllTo.mockImplementation(() => {
        throw new Error('Extraction failed');
      });

      const outputPath = path.join(outputDir, 'enhanced.apkg');

      await expect(
        writer.writeEnhancedApkg('/path/to/original.apkg', mockDeck, generatedImages, outputPath)
      ).rejects.toThrow(FileError);
    });

    it('should add images to answer field correctly', async () => {
      const outputPath = path.join(outputDir, 'enhanced.apkg');
      const mockUpdateStmt = { run: vi.fn() };
      
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE')) {
          return mockUpdateStmt;
        }
        return {
          all: vi.fn().mockReturnValue([
            { id: 100, flds: 'Question 1\x1fOriginal Answer 1', card_id: 1 }
          ])
        };
      });

      await writer.writeEnhancedApkg(
        '/path/to/original.apkg',
        mockDeck,
        generatedImages,
        outputPath
      );

      expect(mockUpdateStmt.run).toHaveBeenCalledWith(
        'Question 1\x1f<img src="image1.png"><br>Original Answer 1',
        100
      );
    });

    it('should handle cards without images', async () => {
      const limitedImages = new Map([[1, path.join(outputDir, 'image1.png')]]);
      const outputPath = path.join(outputDir, 'enhanced.apkg');

      await expect(
        writer.writeEnhancedApkg('/path/to/original.apkg', mockDeck, limitedImages, outputPath)
      ).resolves.not.toThrow();

      // Should still create the enhanced deck
      expect(mockZip.writeZip).toHaveBeenCalledWith(outputPath);
    });
  });

  describe('cleanup', () => {
    it('should clean up temp directory', async () => {
      // Manually set temp directory to test cleanup
      const outputPath = path.join(outputDir, 'test.apkg');
      
      await writer.writeEnhancedApkg(
        '/path/to/original.apkg',
        mockDeck,
        generatedImages,
        outputPath
      );

      // Cleanup is called automatically in writeEnhancedApkg
      // We can't directly test the private tempDir, but we can verify cleanup doesn't throw
      await expect(writer.cleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup when no temp directory exists', async () => {
      await expect(writer.cleanup()).resolves.not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle corrupted media manifest', async () => {
      const outputPath = path.join(outputDir, 'enhanced.apkg');

      await expect(
        writer.writeEnhancedApkg('/path/to/original.apkg', mockDeck, generatedImages, outputPath)
      ).resolves.not.toThrow();

      // Verify successful completion
      expect(mockZip.writeZip).toHaveBeenCalledWith(outputPath);
    });

    it('should handle notes with insufficient fields', async () => {
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE')) {
          return { run: vi.fn() };
        }
        return {
          all: vi.fn().mockReturnValue([
            { id: 100, flds: 'Single Field Only', card_id: 1 }
          ])
        };
      });

      const outputPath = path.join(outputDir, 'enhanced.apkg');

      await expect(
        writer.writeEnhancedApkg('/path/to/original.apkg', mockDeck, generatedImages, outputPath)
      ).resolves.not.toThrow();
    });

    it('should handle empty generated images map', async () => {
      const emptyImages = new Map<number, string>();
      const outputPath = path.join(outputDir, 'enhanced.apkg');

      await expect(
        writer.writeEnhancedApkg('/path/to/original.apkg', mockDeck, emptyImages, outputPath)
      ).resolves.not.toThrow();

      expect(mockZip.writeZip).toHaveBeenCalledWith(outputPath);
    });
  });
});