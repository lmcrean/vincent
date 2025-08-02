import axios, { AxiosInstance } from 'axios';
import { APIError, NetworkError } from '../utils/errors.js';

interface GeminiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export class GeminiApiClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    
    const config: GeminiConfig = {
      apiKey,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.0-flash-preview-image-generation'
    };

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async generateImage(prompt: string): Promise<Buffer> {
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

  private getApiKey(): string {
    const apiKey = this.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new APIError('No API key provided');
    }
    return apiKey;
  }
}