import axios, { AxiosInstance } from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { ImageRequest, GenerationResult, ImageStyle } from '../types.js';
import { APIError, NetworkError } from '../utils/errors.js';
import { PromptGenerator } from './prompt.js';

interface GeminiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export class ImageGenerator {
  private client: AxiosInstance;
  private promptGenerator: PromptGenerator;
  private apiKey: string;

  constructor(apiKey: string, style: ImageStyle) {
    this.apiKey = apiKey;
    const config: GeminiConfig = {
      apiKey,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.0-flash-preview-image-generation'
    };

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.promptGenerator = new PromptGenerator(style);
  }

  async generateImage(
    cardId: number,
    question: string,
    answer: string,
    outputDir: string
  ): Promise<GenerationResult> {
    try {
      // Generate prompt
      const prompt = this.promptGenerator.generatePrompt(question, answer);
      
      // Make API request
      const imageData = await this.requestImageGeneration(prompt);
      
      // Save image file
      const imagePath = await this.saveImage(cardId, imageData, outputDir);
      
      return {
        cardId,
        success: true,
        imagePath
      };
      
    } catch (error) {
      return {
        cardId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async requestImageGeneration(prompt: string): Promise<Buffer> {
    try {
      const response = await this.client.post(
        `/models/gemini-2.0-flash-preview-image-generation:generateContent`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 1,
            responseMimeType: "image/png"
          }
        },
        {
          params: {
            key: this.getApiKey()
          },
          responseType: 'arraybuffer'
        }
      );

      if (response.status !== 200) {
        throw new APIError(`API request failed with status ${response.status}`);
      }

      return Buffer.from(response.data);
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new NetworkError('Could not connect to image generation service');
        } else if (error.response?.status === 401) {
          throw new APIError('Invalid API key');
        } else if (error.response?.status === 429) {
          throw new APIError('Rate limit exceeded. Please try again later.');
        } else if (error.response?.status === 403) {
          throw new APIError('API quota exceeded');
        }
        
        throw new APIError(`API error: ${error.message}`);
      }
      
      throw error;
    }
  }

  private async saveImage(cardId: number, imageData: Buffer, outputDir: string): Promise<string> {
    await fs.ensureDir(outputDir);
    
    const fileName = `card-${cardId.toString().padStart(3, '0')}.png`;
    const filePath = path.join(outputDir, fileName);
    
    await fs.writeFile(filePath, imageData);
    
    return filePath;
  }

  private getApiKey(): string {
    // Use the API key passed to constructor, fall back to env var
    const apiKey = this.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new APIError('No API key provided');
    }
    return apiKey;
  }
}