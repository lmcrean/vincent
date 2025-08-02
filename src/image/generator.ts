import fs from 'fs-extra';
import path from 'path';
import { GenerationResult, ImageStyle } from '../types.js';
import { PromptGenerator } from './prompt.js';
import { PollinationsApiClient } from './pollinations-client.js';
import { HuggingFaceClient } from './huggingface-client.js';
import { MockImageGenerator } from './mock-generator.js';

export class ImageGenerator {
  private promptGenerator: PromptGenerator;
  private apiClient: PollinationsApiClient | null = null;
  private huggingFaceClient: HuggingFaceClient | null = null;
  private mockGenerator: MockImageGenerator | null = null;
  private isMockMode: boolean;
  private isHuggingFaceMode: boolean;

  constructor(apiKeyOrMode: string, style: ImageStyle, mockFailureConfig?: any) {
    this.isMockMode = apiKeyOrMode === 'mock';
    this.isHuggingFaceMode = apiKeyOrMode === 'huggingface';
    this.promptGenerator = new PromptGenerator(style);
    
    if (this.isMockMode) {
      console.log('🧪 MOCK MODE ACTIVATED');
      console.log('Using placeholder images for testing');
      console.log('No external API calls will be made');
      this.mockGenerator = new MockImageGenerator(mockFailureConfig);
    } else if (this.isHuggingFaceMode) {
      console.log('🤗 HUGGING FACE MODE ACTIVATED');
      console.log('Using DALL-E 3 XL LoRA v2 for high-quality image generation');
      console.log('No API key required - free Hugging Face Space');
      this.huggingFaceClient = new HuggingFaceClient();
    } else {
      console.log('🌸 POLLINATIONS MODE ACTIVATED');
      console.log('Using Pollinations AI for free image generation');
      console.log('No API key required - completely free service');
      this.apiClient = new PollinationsApiClient();
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
      
      if (this.isHuggingFaceMode && this.huggingFaceClient) {
        const imageData = await this.huggingFaceClient.generateImage(prompt);
        const imagePath = await this.saveImage(cardId, imageData, outputDir);
        
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