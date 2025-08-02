import fs from 'fs-extra';
import path from 'path';
import { GenerationResult, ImageStyle } from '../types.js';
import { PromptGenerator } from './prompt.js';
import { GeminiApiClient } from './api-client.js';
import { MockImageGenerator } from './mock-generator.js';

export class ImageGenerator {
  private promptGenerator: PromptGenerator;
  private apiClient: GeminiApiClient | null = null;
  private mockGenerator: MockImageGenerator | null = null;
  private isMockMode: boolean;

  constructor(apiKey: string, style: ImageStyle) {
    console.log('🐛 DEBUG: ImageGenerator constructor called with apiKey:', apiKey);
    this.isMockMode = apiKey === 'mock';
    console.log('🐛 DEBUG: isMockMode set to:', this.isMockMode);
    
    this.promptGenerator = new PromptGenerator(style);
    
    if (this.isMockMode) {
      this.mockGenerator = new MockImageGenerator();
    } else {
      this.apiClient = new GeminiApiClient(apiKey);
    }
  }

  async generateImage(
    cardId: number,
    question: string,
    answer: string,
    outputDir: string
  ): Promise<GenerationResult> {
    try {
      const prompt = this.promptGenerator.generatePrompt(question, answer);
      
      if (this.isMockMode && this.mockGenerator) {
        const imagePath = await this.mockGenerator.generateMockImage(cardId, question, outputDir);
        return {
          cardId,
          success: true,
          imagePath
        };
      }
      
      if (this.apiClient) {
        const imageData = await this.apiClient.generateImage(prompt);
        const imagePath = await this.saveImage(cardId, imageData, outputDir);
        
        return {
          cardId,
          success: true,
          imagePath
        };
      }

      throw new Error('No valid image generation method available');
      
    } catch (error) {
      return {
        cardId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async saveImage(cardId: number, imageData: Buffer, outputDir: string): Promise<string> {
    await fs.ensureDir(outputDir);
    
    const fileName = `card-${cardId.toString().padStart(3, '0')}.png`;
    const filePath = path.join(outputDir, fileName);
    
    await fs.writeFile(filePath, imageData);
    
    return filePath;
  }
}