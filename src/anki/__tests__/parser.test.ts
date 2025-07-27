import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { tmpdir } from 'os';
import AdmZip from 'adm-zip';
import Database from 'better-sqlite3';
import { AnkiParser } from '../parser.js';
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

describe('AnkiParser', () => {
  let parser: AnkiParser;
  let tempDir: string;
  let mockZip: any;
  let mockDb: any;
  let mockCreateTempDir: any;
  let existsSyncSpy: any;

  beforeEach(async () => {
    parser = new AnkiParser();
    
    // Create actual temp directory for testing
    tempDir = path.join(tmpdir(), 'vincent-parser-test-' + Date.now());
    await fs.ensureDir(tempDir);

    // Mock createTempDir to return our test directory
    const { createTempDir } = await import('../../utils/files.js');
    mockCreateTempDir = vi.mocked(createTempDir);
    mockCreateTempDir.mockResolvedValue(tempDir);

    // Spy on fs.existsSync and default to true
    existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    // Mock AdmZip
    mockZip = {
      extractAllTo: vi.fn()
    };
    vi.mocked(AdmZip).mockReturnValue(mockZip);

    // Mock Database
    mockDb = {
      prepare: vi.fn(),
      close: vi.fn()
    };
    vi.mocked(Database).mockReturnValue(mockDb);
  });

  afterEach(async () => {
    await parser.cleanup();
    try {
      await fs.remove(tempDir);
    } catch {
      // Ignore cleanup errors
    }
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('parseApkg', () => {
    beforeEach(async () => {
      // Create mock collection.anki2 file
      const dbPath = path.join(tempDir, 'collection.anki2');
      await fs.writeFile(dbPath, 'mock-db-content');
      
      // Create mock media directory
      const mediaDir = path.join(tempDir, 'collection.media');
      await fs.ensureDir(mediaDir);
      await fs.writeFile(path.join(mediaDir, 'test-image.png'), 'mock-image-data');
    });

    it('should successfully parse a valid .apkg file', async () => {
      // Mock database queries
      const mockGetStmt = {
        get: vi.fn().mockReturnValue({
          decks: JSON.stringify({
            '1': { name: 'Default' },
            '2': { name: 'Biology Deck' }
          })
        })
      };

      const mockAllStmt = {
        all: vi.fn().mockReturnValue([
          {
            id: 1,
            nid: 100,
            flds: 'What is photosynthesis?\x1fThe process by which plants convert light into energy',
            tags: 'biology plants'
          },
          {
            id: 2,
            nid: 200,
            flds: 'What is DNA?\x1fDeoxyribonucleic acid',
            tags: 'biology genetics'
          }
        ])
      };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT decks')) {
          return mockGetStmt;
        } else if (sql.includes('SELECT')) {
          return mockAllStmt;
        }
        return { get: vi.fn(), all: vi.fn() };
      });

      const result = await parser.parseApkg('/path/to/test.apkg');

      expect(result.name).toBe('Biology Deck');
      expect(result.cards).toHaveLength(2);
      expect(result.cards[0]).toEqual({
        id: 1,
        nid: 100,
        question: 'What is photosynthesis?',
        answer: 'The process by which plants convert light into energy',
        fields: ['What is photosynthesis?', 'The process by which plants convert light into energy'],
        tags: ['biology', 'plants']
      });
      expect(result.mediaFiles.size).toBe(1);
      expect(result.mediaFiles.has('test-image.png')).toBe(true);
    });

    it('should handle deck with no custom name', async () => {
      const mockGetStmt = {
        get: vi.fn().mockReturnValue({
          decks: JSON.stringify({
            '1': { name: 'Default' }
          })
        })
      };

      const mockAllStmt = {
        all: vi.fn().mockReturnValue([])
      };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT decks')) {
          return mockGetStmt;
        }
        return mockAllStmt;
      });

      const result = await parser.parseApkg('/path/to/test.apkg');

      expect(result.name).toBe('Unknown Deck');
      expect(result.cards).toHaveLength(0);
    });

    it('should handle cards with HTML content', async () => {
      const mockGetStmt = {
        get: vi.fn().mockReturnValue({
          decks: JSON.stringify({ '2': { name: 'Test Deck' } })
        })
      };

      const mockAllStmt = {
        all: vi.fn().mockReturnValue([
          {
            id: 1,
            nid: 100,
            flds: '<p>HTML Question</p>\x1f<div><b>HTML Answer</b></div>',
            tags: 'test html'
          }
        ])
      };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT decks')) {
          return mockGetStmt;
        }
        return mockAllStmt;
      });

      const result = await parser.parseApkg('/path/to/test.apkg');

      expect(result.cards[0].question).toBe('HTML Question');
      expect(result.cards[0].answer).toBe('HTML Answer');
    });

    it('should throw FileError when collection.anki2 is missing', async () => {
      // Mock existsSync to return false for collection.anki2
      existsSyncSpy.mockReturnValue(false);

      await expect(parser.parseApkg('/path/to/test.apkg')).rejects.toThrow(FileError);
      await expect(parser.parseApkg('/path/to/test.apkg')).rejects.toThrow('missing collection.anki2');
    });

    it('should throw FileError when zip extraction fails', async () => {
      mockZip.extractAllTo.mockImplementation(() => {
        throw new Error('Extraction failed');
      });

      await expect(parser.parseApkg('/path/to/test.apkg')).rejects.toThrow(FileError);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(Database).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(parser.parseApkg('/path/to/test.apkg')).rejects.toThrow(FileError);
    });

    it('should handle missing media directory', async () => {
      const mediaDir = path.join(tempDir, 'collection.media');
      
      // Mock existsSync to return false specifically for media directory
      existsSyncSpy.mockImplementation((filePath: string) => {
        return !filePath.includes('collection.media'); // Return false for media dir, true for others
      });

      const mockGetStmt = {
        get: vi.fn().mockReturnValue({
          decks: JSON.stringify({ '2': { name: 'Test Deck' } })
        })
      };

      const mockAllStmt = {
        all: vi.fn().mockReturnValue([])
      };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT decks')) {
          return mockGetStmt;
        }
        return mockAllStmt;
      });

      const result = await parser.parseApkg('/path/to/test.apkg');

      expect(result.name).toBe('Test Deck');
      expect(result.mediaFiles.size).toBe(0);
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      // Create media directory for cleanup tests
      const mediaDir = path.join(tempDir, 'collection.media');
      await fs.ensureDir(mediaDir);
    });

    it('should remove temp directory on cleanup', async () => {
      // Set up mock database responses for successful parsing
      const mockGetStmt = {
        get: vi.fn().mockReturnValue({
          decks: JSON.stringify({ '2': { name: 'Test Deck' } })
        })
      };
      const mockAllStmt = {
        all: vi.fn().mockReturnValue([])
      };
      
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT decks')) {
          return mockGetStmt;
        }
        return mockAllStmt;
      });

      // Parse to set up temp directory
      await parser.parseApkg('/path/to/test.apkg');

      // Verify temp directory was set
      expect(parser.getTempDir()).toBe(tempDir);

      await parser.cleanup();

      // Check that cleanup was called (temp dir should be null)
      expect(parser.getTempDir()).toBeNull();
    });

    it('should handle cleanup when no temp directory exists', async () => {
      await expect(parser.cleanup()).resolves.not.toThrow();
    });

    it('should clean up automatically when parsing fails', async () => {
      // Force parsing to fail
      mockZip.extractAllTo.mockImplementation(() => {
        throw new Error('Extraction failed');
      });

      await expect(parser.parseApkg('/path/to/fail.apkg')).rejects.toThrow();

      // Temp directory should be cleaned up (set to null)
      expect(parser.getTempDir()).toBeNull();
    });
  });

  describe('getTempDir', () => {
    it('should return null when no temp directory is set', () => {
      expect(parser.getTempDir()).toBeNull();
    });

    it('should return temp directory path when set', async () => {
      // Create media directory for this test
      const mediaDir = path.join(tempDir, 'collection.media');
      await fs.ensureDir(mediaDir);

      // Set up mock database responses for successful parsing
      const mockGetStmt = { 
        get: vi.fn().mockReturnValue({
          decks: JSON.stringify({ '2': { name: 'Test Deck' } })
        })
      };
      const mockAllStmt = { all: vi.fn().mockReturnValue([]) };
      
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT decks')) {
          return mockGetStmt;
        }
        return mockAllStmt;
      });

      await parser.parseApkg('/path/to/test.apkg');

      expect(parser.getTempDir()).toBe(tempDir);
    });
  });

  describe('HTML stripping', () => {
    beforeEach(async () => {
      // Create media directory for HTML stripping tests
      const mediaDir = path.join(tempDir, 'collection.media');
      await fs.ensureDir(mediaDir);
    });

    it('should strip HTML tags and entities correctly', async () => {
      const mockGetStmt = {
        get: vi.fn().mockReturnValue({
          decks: JSON.stringify({ '2': { name: 'Test Deck' } })
        })
      };

      const mockAllStmt = {
        all: vi.fn().mockReturnValue([
          {
            id: 1,
            nid: 100,
            flds: '<div>Question with <b>bold</b> and <i>italic</i></div>\x1f<p>Answer with &lt;brackets&gt; and&nbsp;spaces &amp; symbols</p>',
            tags: ''
          }
        ])
      };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT decks')) {
          return mockGetStmt;
        }
        return mockAllStmt;
      });

      const result = await parser.parseApkg('/path/to/test.apkg');

      expect(result.cards[0].question).toBe('Question with bold and italic');
      expect(result.cards[0].answer).toBe('Answer with <brackets> and spaces & symbols');
    });
  });

  describe('tags parsing', () => {
    beforeEach(async () => {
      // Create media directory for tags parsing tests
      const mediaDir = path.join(tempDir, 'collection.media');
      await fs.ensureDir(mediaDir);
    });

    it('should parse space-separated tags', async () => {
      const mockGetStmt = {
        get: vi.fn().mockReturnValue({
          decks: JSON.stringify({ '2': { name: 'Test Deck' } })
        })
      };

      const mockAllStmt = {
        all: vi.fn().mockReturnValue([
          {
            id: 1,
            nid: 100,
            flds: 'Question\x1fAnswer',
            tags: 'tag1 tag2 tag3'
          }
        ])
      };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT decks')) {
          return mockGetStmt;
        }
        return mockAllStmt;
      });

      const result = await parser.parseApkg('/path/to/test.apkg');

      expect(result.cards[0].tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle empty tags', async () => {
      const mockGetStmt = {
        get: vi.fn().mockReturnValue({
          decks: JSON.stringify({ '2': { name: 'Test Deck' } })
        })
      };

      const mockAllStmt = {
        all: vi.fn().mockReturnValue([
          {
            id: 1,
            nid: 100,
            flds: 'Question\x1fAnswer',
            tags: ''
          }
        ])
      };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT decks')) {
          return mockGetStmt;
        }
        return mockAllStmt;
      });

      const result = await parser.parseApkg('/path/to/test.apkg');

      expect(result.cards[0].tags).toEqual([]);
    });
  });
});