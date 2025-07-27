import path from 'path';
import fs from 'fs-extra';
import { TxtCard, TxtDeck } from '../types.js';
import { FileError } from '../utils/errors.js';

export class TxtParser {
  async parseTxt(txtPath: string): Promise<TxtDeck> {
    try {
      // Read the text file
      const content = await fs.readFile(txtPath, 'utf8');
      
      // Parse lines with semicolon separation
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && line.includes(';'));
      
      if (lines.length === 0) {
        throw new FileError('No cards found');
      }
      
      // Extract deck name from filename
      const deckName = path.basename(txtPath, '.txt');
      
      // Parse cards
      const cards = lines.map((line, index) => {
        const parts = line.split(';');
        if (parts.length < 2) {
          throw new FileError('Invalid deck format');
        }
        
        const question = parts[0].trim();
        const answer = parts.slice(1).join(';').trim(); // Join in case answer contains semicolons
        
        if (!question || !answer) {
          throw new FileError(`Empty question or answer on line ${index + 1}`);
        }
        
        return {
          id: index + 1,
          question,
          answer
        } as TxtCard;
      });
      
      return {
        name: deckName,
        cards
      };
      
    } catch (error) {
      if (error instanceof FileError) {
        throw error;
      }
      throw new FileError(`Failed to parse text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}