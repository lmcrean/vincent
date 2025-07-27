import AdmZip from 'adm-zip';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { AnkiCard, AnkiDeck } from '../types.js';
import { FileError } from '../utils/errors.js';
import { createTempDir } from '../utils/files.js';

export class AnkiParser {
  private tempDir: string | null = null;

  async parseApkg(apkgPath: string): Promise<AnkiDeck> {
    try {
      // Create temp directory for extraction
      this.tempDir = await createTempDir();
      
      // Extract .txt file (it's a zip)
      const zip = new AdmZip(apkgPath);
      zip.extractAllTo(this.tempDir, true);
      
      // Parse collection database
      const dbPath = path.join(this.tempDir, 'collection.anki2');
      if (!fs.existsSync(dbPath)) {
        throw new FileError('Invalid .txt file: missing collection.anki2');
      }
      
      const db = new Database(dbPath);
      
      // Extract deck name
      const deckName = this.getDeckName(db);
      
      // Extract cards
      const cards = this.extractCards(db);
      
      // Extract media files
      const mediaFiles = await this.extractMediaFiles();
      
      db.close();
      
      return {
        name: deckName,
        cards,
        mediaFiles
      };
      
    } catch (error) {
      await this.cleanup();
      if (error instanceof FileError) {
        throw error;
      }
      throw new FileError(`Failed to parse .txt file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getDeckName(db: Database.Database): string {
    try {
      const result = db.prepare(`
        SELECT decks FROM col LIMIT 1
      `).get() as { decks: string } | undefined;
      
      if (result && result.decks) {
        const decks = JSON.parse(result.decks);
        const deckId = Object.keys(decks).find(id => id !== '1');
        if (deckId && decks[deckId]) {
          return decks[deckId].name;
        }
      }
      
      return 'Unknown Deck';
    } catch {
      return 'Unknown Deck';
    }
  }

  private extractCards(db: Database.Database): AnkiCard[] {
    const stmt = db.prepare(`
      SELECT 
        c.id,
        c.nid,
        n.flds,
        n.tags
      FROM cards c
      JOIN notes n ON c.nid = n.id
      ORDER BY c.id
    `);
    
    const rows = stmt.all() as Array<{
      id: number;
      nid: number;
      flds: string;
      tags: string;
    }>;
    
    return rows.map(row => {
      const fields = row.flds.split('\x1f');
      const question = this.stripHtml(fields[0] || '');
      const answer = this.stripHtml(fields[1] || '');
      const tags = row.tags.trim() ? row.tags.trim().split(' ') : [];
      
      return {
        id: row.id,
        nid: row.nid,
        question,
        answer,
        fields,
        tags
      };
    });
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&lt;/g, '<')   // Replace HTML entities
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }

  private async extractMediaFiles(): Promise<Map<string, Buffer>> {
    const mediaFiles = new Map<string, Buffer>();
    
    if (!this.tempDir) return mediaFiles;
    
    const mediaDir = path.join(this.tempDir, 'collection.media');
    
    if (fs.existsSync(mediaDir)) {
      const files = await fs.readdir(mediaDir);
      for (const file of files) {
        const filePath = path.join(mediaDir, file);
        const content = await fs.readFile(filePath);
        mediaFiles.set(file, content);
      }
    }
    
    return mediaFiles;
  }

  async cleanup(): Promise<void> {
    if (this.tempDir && fs.existsSync(this.tempDir)) {
      await fs.remove(this.tempDir);
      this.tempDir = null;
    }
  }

  getTempDir(): string | null {
    return this.tempDir;
  }
}