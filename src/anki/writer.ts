import path from 'path';
import fs from 'fs-extra';
import { TxtDeck } from '../types.js';
import { FileError } from '../utils/errors.js';

export class TxtWriter {
  async writeEnhancedTxt(
    deck: TxtDeck, 
    generatedImages: Map<number, string>,
    outputPath: string
  ): Promise<void> {
    try {
      // Build enhanced content
      const enhancedLines = deck.cards.map(card => {
        const imagePath = generatedImages.get(card.id);
        let line = `${card.question};${card.answer}`;
        
        if (imagePath) {
          const imageFileName = path.basename(imagePath);
          line += `;<img src='${imageFileName}'>`;
        }
        
        return line;
      });
      
      // Write enhanced text file
      const content = enhancedLines.join('\n') + '\n';
      await fs.writeFile(outputPath, content, 'utf8');
      
      // Copy image files to output directory if they exist
      if (generatedImages.size > 0) {
        const outputDir = path.dirname(outputPath);
        for (const [cardId, imagePath] of generatedImages) {
          if (await fs.pathExists(imagePath)) {
            const imageFileName = path.basename(imagePath);
            const destPath = path.join(outputDir, imageFileName);
            await fs.copy(imagePath, destPath);
          }
        }
      }
      
    } catch (error) {
      if (error instanceof FileError) {
        throw error;
      }
      throw new FileError(`Failed to write enhanced text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}