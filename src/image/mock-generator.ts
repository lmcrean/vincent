import fs from 'fs-extra';
import path from 'path';

export class MockImageGenerator {
  constructor() {
    console.log('🧪 MOCK MODE ACTIVATED');
    console.log('Using placeholder images for testing');
    console.log('No external API calls will be made');
  }

  async generateMockImage(cardId: number, question: string, outputDir: string): Promise<string> {
    await fs.ensureDir(outputDir);
    
    const fileName = `card-${cardId.toString().padStart(3, '0')}.png`;
    const filePath = path.join(outputDir, fileName);
    
    const mockImageData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    
    await fs.writeFile(filePath, mockImageData);
    
    // Simulate processing time (shorter for testing)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return filePath;
  }
}