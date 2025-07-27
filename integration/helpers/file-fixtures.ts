import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import Database from 'better-sqlite3';
import tmp from 'tmp-promise';

export interface TestAnkiCard {
  id: number;
  question: string;
  answer: string;
  tags?: string[];
}

export interface CreateApkgOptions {
  deckName: string;
  cards: TestAnkiCard[];
  mediaFiles?: Map<string, Buffer>;
}

/**
 * Creates a temporary .apkg file for testing
 */
export async function createTestApkg(options: CreateApkgOptions): Promise<string> {
  const tempDir = await tmp.dir({ prefix: 'vincent-test-apkg-' });
  const apkgPath = path.join(tempDir.path, `${options.deckName}.apkg`);
  
  // Create collection.anki2 database
  const dbPath = path.join(tempDir.path, 'collection.anki2');
  const db = new Database(dbPath);
  
  // Initialize Anki database schema (simplified)
  db.exec(`
    CREATE TABLE col (
      id INTEGER PRIMARY KEY,
      crt INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      scm INTEGER NOT NULL,
      ver INTEGER NOT NULL,
      dty INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      ls INTEGER NOT NULL,
      conf TEXT NOT NULL,
      models TEXT NOT NULL,
      decks TEXT NOT NULL,
      dconf TEXT NOT NULL,
      tags TEXT NOT NULL
    );
    
    CREATE TABLE notes (
      id INTEGER PRIMARY KEY,
      guid TEXT NOT NULL,
      mid INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      tags TEXT NOT NULL,
      flds TEXT NOT NULL,
      sfld TEXT NOT NULL,
      csum INTEGER NOT NULL,
      flags INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    
    CREATE TABLE cards (
      id INTEGER PRIMARY KEY,
      nid INTEGER NOT NULL,
      did INTEGER NOT NULL,
      ord INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      type INTEGER NOT NULL,
      queue INTEGER NOT NULL,
      due INTEGER NOT NULL,
      ivl INTEGER NOT NULL,
      factor INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      lapses INTEGER NOT NULL,
      left INTEGER NOT NULL,
      odue INTEGER NOT NULL,
      odid INTEGER NOT NULL,
      flags INTEGER NOT NULL,
      data TEXT NOT NULL
    );
  `);
  
  // Insert collection data
  const now = Date.now();
  const deckId = 2;
  const modelId = 1;
  
  const decks = {
    '1': { name: 'Default' },
    '2': { 
      id: deckId,
      name: options.deckName,
      extendNew: 20,
      extendRev: 50,
      usn: 0,
      collapsed: false,
      newToday: [0, 0],
      revToday: [0, 0],
      lrnToday: [0, 0],
      timeToday: [0, 0],
      conf: 1,
      desc: '',
      dyn: 0,
      mod: now
    }
  };
  
  const models = {
    [modelId]: {
      id: modelId,
      name: 'Basic',
      type: 0,
      mod: now,
      usn: 0,
      sortf: 0,
      did: deckId,
      tmpls: [{
        name: 'Card 1',
        ord: 0,
        qfmt: '{{Front}}',
        afmt: '{{FrontSide}}<hr id="answer">{{Back}}',
        did: null,
        bqfmt: '',
        bafmt: ''
      }],
      flds: [
        { name: 'Front', ord: 0, sticky: false, rtl: false, font: 'Arial', size: 20 },
        { name: 'Back', ord: 1, sticky: false, rtl: false, font: 'Arial', size: 20 }
      ],
      css: '.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }'
    }
  };
  
  db.prepare(`
    INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
    VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, '{}', '{}')
  `).run(
    now,
    now,
    now,
    JSON.stringify({}),
    JSON.stringify(models),
    JSON.stringify(decks)
  );
  
  // Insert notes and cards
  options.cards.forEach((card, index) => {
    const noteId = index + 1;
    const cardId = index + 1;
    
    // Insert note
    db.prepare(`
      INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?, 0, 0, '')
    `).run(
      noteId,
      `test-guid-${noteId}`,
      modelId,
      now,
      card.tags?.join(' ') || '',
      `${card.question}\x1f${card.answer}`,
      card.question
    );
    
    // Insert card
    db.prepare(`
      INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data)
      VALUES (?, ?, ?, 0, ?, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, '')
    `).run(cardId, noteId, deckId, now);
  });
  
  db.close();
  
  // Create media files if provided
  let mediaContent = '{}';
  const mediaDir = path.join(tempDir.path, 'collection.media');
  
  if (options.mediaFiles && options.mediaFiles.size > 0) {
    const mediaMap: Record<string, string> = {};
    let mediaIndex = 0;
    
    // Create collection.media directory
    await fs.ensureDir(mediaDir);
    
    for (const [filename, buffer] of options.mediaFiles) {
      const mediaFilename = `${mediaIndex}`;
      mediaMap[mediaFilename] = filename;
      
      // Write to both the temp directory root (for zip) and collection.media (for extraction)
      await fs.writeFile(path.join(tempDir.path, mediaFilename), buffer);
      await fs.writeFile(path.join(mediaDir, filename), buffer);
      mediaIndex++;
    }
    
    mediaContent = JSON.stringify(mediaMap);
  }
  
  await fs.writeFile(path.join(tempDir.path, 'media'), mediaContent);
  
  // Create .apkg zip file
  const zip = new AdmZip();
  zip.addLocalFile(dbPath);
  zip.addLocalFile(path.join(tempDir.path, 'media'));
  
  // Add media files if any
  if (options.mediaFiles) {
    let mediaIndex = 0;
    for (const [_, buffer] of options.mediaFiles) {
      zip.addFile(`${mediaIndex}`, buffer);
      mediaIndex++;
    }
  }
  
  // Also add the collection.media directory to the zip
  if (options.mediaFiles && options.mediaFiles.size > 0) {
    for (const [filename, buffer] of options.mediaFiles) {
      zip.addFile(`collection.media/${filename}`, buffer);
    }
  }
  
  zip.writeZip(apkgPath);
  
  return apkgPath;
}

/**
 * Creates a sample image buffer for testing
 */
export function createSampleImage(): Buffer {
  // 1x1 PNG image in base64
  const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  return Buffer.from(base64Data, 'base64');
}

/**
 * Creates test directory structure
 */
export async function createTestOutputDir(): Promise<string> {
  const tempDir = await tmp.dir({ prefix: 'vincent-test-output-' });
  return tempDir.path;
}

/**
 * Validates that an .apkg file contains expected content
 */
export async function validateApkgContent(apkgPath: string, expectedCards: TestAnkiCard[]): Promise<boolean> {
  const tempDir = await tmp.dir({ prefix: 'vincent-validate-apkg-' });
  
  try {
    // Extract .apkg
    const zip = new AdmZip(apkgPath);
    zip.extractAllTo(tempDir.path, true);
    
    // Open database
    const dbPath = path.join(tempDir.path, 'collection.anki2');
    if (!await fs.pathExists(dbPath)) {
      return false;
    }
    
    const db = new Database(dbPath);
    
    // Check cards count
    const cardCount = db.prepare('SELECT COUNT(*) as count FROM cards').get() as { count: number };
    if (cardCount.count !== expectedCards.length) {
      db.close();
      return false;
    }
    
    // Check specific cards
    const notes = db.prepare('SELECT * FROM notes ORDER BY id').all() as any[];
    
    for (let i = 0; i < expectedCards.length; i++) {
      const note = notes[i];
      const fields = note.flds.split('\x1f');
      const expectedCard = expectedCards[i];
      
      // Vincent adds images to the answer field, so we need to check if the original content is still there
      const answerContainsExpected = fields[1].includes(expectedCard.answer);
      
      if (fields[0] !== expectedCard.question || !answerContainsExpected) {
        db.close();
        return false;
      }
    }
    
    db.close();
    return true;
    
  } catch (error) {
    return false;
  } finally {
    await fs.remove(tempDir.path).catch(() => {});
  }
}