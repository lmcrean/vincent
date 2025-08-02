import axios, { AxiosInstance } from 'axios';
import { 
  APIError, 
  NetworkError, 
  RateLimitError, 
  NetworkTimeoutError, 
  ConnectionError 
} from '../utils/errors.js';

interface GeminiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface RetryConfig {
  maxAttempts: number;
  delays: number[];
  timeoutMs: number;
}

export class GeminiApiClient {
  private client: AxiosInstance;
  private apiKey: string;
  private retryConfig: RetryConfig;

  constructor(apiKey: string, retryConfig?: Partial<RetryConfig>) {
    this.apiKey = apiKey;
    
    // Default retry configuration for Iteration 2
    this.retryConfig = {
      maxAttempts: 3,
      delays: [1000, 2000, 4000], // 1s, 2s, 4s exponential backoff
      timeoutMs: 30000,
      ...retryConfig
    };
    
    const config: GeminiConfig = {
      apiKey,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.0-flash-preview-image-generation'
    };

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: this.retryConfig.timeoutMs,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async generateImage(prompt: string): Promise<Buffer> {
    return this.executeWithRetry(async (attempt: number) => {
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
              maxOutputTokens: 8192,
              responseModalities: ["TEXT", "IMAGE"]
            }
          },
          {
            params: {
              key: this.getApiKey()
            }
          }
        );

        if (response.status !== 200) {
          throw new APIError(`API request failed with status ${response.status}`);
        }

        // Extract image data from the response
        const candidate = response.data.candidates?.[0];
        if (!candidate) {
          throw new APIError('No content generated in response');
        }

        // Find the image part in the response
        const imagePart = candidate.content?.parts?.find((part: any) => part.inlineData?.mimeType?.startsWith('image/'));
        if (!imagePart || !imagePart.inlineData?.data) {
          throw new APIError('No image data found in response');
        }

        // Convert base64 to buffer
        return Buffer.from(imagePart.inlineData.data, 'base64');
        
      } catch (error) {
        // Enhanced error logging for debugging
        console.log('🐛 DEBUG: API Error Details:', {
          status: axios.isAxiosError(error) ? error.response?.status : 'unknown',
          statusText: axios.isAxiosError(error) ? error.response?.statusText : 'unknown',
          data: axios.isAxiosError(error) ? error.response?.data : 'unknown',
          message: error instanceof Error ? error.message : 'unknown'
        });
        
        if (axios.isAxiosError(error)) {
          // Network/connection errors - retryable
          if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            throw new ConnectionError('Could not connect to image generation service');
          }
          
          // Timeout errors - retryable
          if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            throw new NetworkTimeoutError(this.retryConfig.timeoutMs / 1000);
          }
          
          // Rate limit errors - retryable with delay
          if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'] 
              ? parseInt(error.response.headers['retry-after']) 
              : undefined;
            throw new RateLimitError(retryAfter);
          }
          
          // Authentication errors - not retryable
          if (error.response?.status === 401) {
            throw new APIError('Invalid API key');
          }
          
          // Quota errors - not retryable
          if (error.response?.status === 403) {
            throw new APIError('API quota exceeded');
          }
          
          // Server errors (5xx) - retryable
          if (error.response?.status && error.response.status >= 500) {
            throw new APIError(`Server error: ${error.response.status}`);
          }
          
          // Client errors (4xx) - not retryable
          if (error.response?.status && error.response.status >= 400) {
            throw new APIError(`Client error: ${error.response.status}`);
          }
          
          throw new NetworkError(`Network error: ${error.message}`);
        }
        
        throw error;
      }
    });
  }

  private async executeWithRetry<T>(operation: (attempt: number) => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation(attempt);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on non-retryable errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxAttempts) {
          throw error;
        }
        
        // Calculate delay for next retry
        const delay = this.getRetryDelay(attempt, error);
        
        // Log retry attempt (for debugging)
        console.log(`🔄 API request failed (attempt ${attempt}/${this.retryConfig.maxAttempts}), retrying in ${delay}ms...`);
        
        // Wait before retrying
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }
  
  private isNonRetryableError(error: any): boolean {
    // Don't retry authentication, authorization, or quota errors
    if (error instanceof APIError) {
      const message = error.message.toLowerCase();
      if (message.includes('invalid api key') || 
          message.includes('quota exceeded') ||
          message.includes('client error')) {
        return true;
      }
    }
    
    return false;
  }
  
  private getRetryDelay(attempt: number, error: any): number {
    // Use custom delay from rate limit header if available
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000; // Convert to milliseconds
    }
    
    // Use exponential backoff delay
    const delayIndex = attempt - 1;
    return delayIndex < this.retryConfig.delays.length 
      ? this.retryConfig.delays[delayIndex]
      : this.retryConfig.delays[this.retryConfig.delays.length - 1];
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getApiKey(): string {
    const apiKey = this.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new APIError('No API key provided');
    }
    return apiKey;
  }
}