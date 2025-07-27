import AdmZip from 'adm-zip';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { AnkiDeck } from '../types.js';
import { FileError } from '../utils/errors.js';
import { createTempDir } from '../utils/files.js';

export class AnkiWriter {
  private tempDir: string | null = null;

  async writeEnhancedApkg(
    originalApkgPath: string, 
    deck: AnkiDeck, 
    generatedImages: Map<number, string>,
    outputPath: string
  ): Promise<void> {
    try {
      // Create temp directory for building enhanced deck
      this.tempDir = await createTempDir();
      
      // Extract original .txt
      const zip = new AdmZip(originalApkgPath);
      zip.extractAllTo(this.tempDir, true);
      
      // Update database with image references
      await this.updateDatabase(generatedImages);
      
      // Copy generated images to media directory
      await this.addGeneratedImages(generatedImages);
      
      // Create enhanced .txt file
      await this.createApkgFile(outputPath);
      
    } catch (error) {
      await this.cleanup();
      if (error instanceof FileError) {
        throw error;
      }
      throw new FileError(`Failed to create enhanced .txt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await this.cleanup();
    }
  }

  private async updateDatabase(generatedImages: Map<number, string>): Promise<void> {
    if (!this.tempDir) throw new FileError('No temp directory available');
    
    const dbPath = path.join(this.tempDir, 'collection.anki2');
    const db = new Database(dbPath);
    
    try {
      // For iteration 1, we'll add images to the answer field
      // This is a simple approach - real Anki integration would be more sophisticated
      
      const updateStmt = db.prepare(`
        UPDATE notes 
        SET flds = ? 
        WHERE id = ?
      `);
      
      const selectStmt = db.prepare(`
        SELECT n.id, n.flds, c.id as card_id
        FROM notes n
        JOIN cards c ON n.id = c.nid
      `);
      
      const notes = selectStmt.all() as Array<{
        id: number;
        flds: string;
        card_id: number;
      }>;
      
      for (const note of notes) {
        const imagePath = generatedImages.get(note.card_id);
        if (imagePath) {
          const imageFileName = path.basename(imagePath);
          const fields = note.flds.split('\x1f');
          
          // Add image to answer field (field[1])
          if (fields.length >= 2) {
            fields[1] = `<img src="${imageFileName}"><br>${fields[1]}`;
            const updatedFields = fields.join('\x1f');
            updateStmt.run(updatedFields, note.id);
          }
        }
      }
      
    } finally {
      db.close();
    }
  }

  private async addGeneratedImages(generatedImages: Map<number, string>): Promise<void> {
    if (!this.tempDir) throw new FileError('No temp directory available');
    
    const mediaDir = path.join(this.tempDir, 'collection.media');
    await fs.ensureDir(mediaDir);
    
    // Copy each generated image
    for (const [cardId, imagePath] of generatedImages) {
      if (fs.existsSync(imagePath)) {
        const fileName = path.basename(imagePath);
        const destPath = path.join(mediaDir, fileName);
        await fs.copy(imagePath, destPath);
      }
    }
    
    // Update media manifest (simple approach for i1)
    await this.updateMediaManifest(generatedImages);
  }

  private async updateMediaManifest(generatedImages: Map<number, string>): Promise<void> {
    if (!this.tempDir) throw new FileError('No temp directory available');
    
    const mediaPath = path.join(this.tempDir, 'media');
    let mediaManifest: Record<string, string> = {};
    
    // Read existing manifest if it exists
    if (fs.existsSync(mediaPath)) {
      try {
        const content = await fs.readFile(mediaPath, 'utf8');
        mediaManifest = JSON.parse(content);
      } catch {
        // If parsing fails, start with empty manifest
        mediaManifest = {};
      }
    }
    
    // Add new images to manifest
    let fileIndex = Object.keys(mediaManifest).length;
    for (const [cardId, imagePath] of generatedImages) {
      const fileName = path.basename(imagePath);
      if (!Object.values(mediaManifest).includes(fileName)) {
        mediaManifest[fileIndex.toString()] = fileName;
        fileIndex++;
      }
    }
    
    // Write updated manifest
    await fs.writeFile(mediaPath, JSON.stringify(mediaManifest));
  }

  private async createApkgFile(outputPath: string): Promise<void> {
    if (!this.tempDir) throw new FileError('No temp directory available');
    
    const zip = new AdmZip();
    
    // Add all files from temp directory
    const files = await fs.readdir(this.tempDir);
    for (const file of files) {
      const filePath = path.join(this.tempDir, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isFile()) {
        zip.addLocalFile(filePath);
      } else if (stat.isDirectory() && file === 'collection.media') {
        // Add media directory contents
        const mediaFiles = await fs.readdir(filePath);
        for (const mediaFile of mediaFiles) {
          const mediaFilePath = path.join(filePath, mediaFile);
          zip.addLocalFile(mediaFilePath, 'collection.media/');
        }
      }
    }
    
    // Write the .txt file
    zip.writeZip(outputPath);
  }

  async cleanup(): Promise<void> {
    if (this.tempDir && fs.existsSync(this.tempDir)) {
      await fs.remove(this.tempDir);
      this.tempDir = null;
    }
  }
}