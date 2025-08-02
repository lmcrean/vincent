import axios, { AxiosInstance } from 'axios';
import { 
  APIError, 
  NetworkError, 
  NetworkTimeoutError, 
  ConnectionError 
} from '../utils/errors.js';

interface PollinationsConfig {
  baseUrl: string;
  timeout: number;
}

interface RetryConfig {
  maxAttempts: number;
  delays: number[];
  timeoutMs: number;
}

/**
 * Pollinations AI API Client
 * Free image generation API with no registration required
 * https://pollinations.ai/
 */
export class PollinationsApiClient {
  private client: AxiosInstance;
  private retryConfig: RetryConfig;

  constructor(retryConfig?: Partial<RetryConfig>) {
    // Default retry configuration
    this.retryConfig = {
      maxAttempts: 3,
      delays: [1000, 2000, 4000], // 1s, 2s, 4s exponential backoff
      timeoutMs: 30000,
      ...retryConfig
    };
    
    const config: PollinationsConfig = {
      baseUrl: 'https://pollinations.ai',
      timeout: this.retryConfig.timeoutMs
    };

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'User-Agent': 'Vincent-Anki-Image-Generator/1.0'
      }
    });
  }

  async generateImage(prompt: string): Promise<Buffer> {
    return this.executeWithRetry(async (attempt: number) => {
      try {
        // Pollinations API: Simple GET request to /p/{prompt}
        // URL-encode the prompt to handle special characters
        const encodedPrompt = encodeURIComponent(prompt);
        
        console.log(`🎨 Generating image with Pollinations API (attempt ${attempt})`);
        console.log(`🔤 Prompt: "${prompt}"`);
        
        const response = await this.client.get(`/p/${encodedPrompt}`, {
          responseType: 'arraybuffer'
        });

        if (response.status !== 200) {
          throw new APIError(`API request failed with status ${response.status}`);
        }

        if (!response.data || response.data.byteLength === 0) {
          throw new APIError('No image data received from API');
        }

        console.log(`✅ Image generated successfully (${response.data.byteLength} bytes)`);
        return Buffer.from(response.data);
        
      } catch (error) {
        // Enhanced error logging for debugging
        console.log('🐛 DEBUG: Pollinations API Error Details:', {
          status: axios.isAxiosError(error) ? error.response?.status : 'unknown',
          statusText: axios.isAxiosError(error) ? error.response?.statusText : 'unknown',
          message: error instanceof Error ? error.message : 'unknown',
          attempt: attempt
        });
        
        if (axios.isAxiosError(error)) {
          // Network/connection errors - retryable
          if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            throw new ConnectionError('Could not connect to Pollinations image generation service');
          }
          
          // Timeout errors - retryable
          if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            throw new NetworkTimeoutError(this.retryConfig.timeoutMs / 1000);
          }
          
          // Rate limit errors (if any) - retryable with delay
          if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'] 
              ? parseInt(error.response.headers['retry-after']) 
              : undefined;
            throw new NetworkError(`Rate limit exceeded${retryAfter ? ` (retry after ${retryAfter}s)` : ''}`);
          }
          
          // 4xx client errors (except 429) - not retryable
          if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
            throw new APIError(`Client error: ${error.response.status} - ${error.response.statusText}`);
          }
          
          // 5xx server errors - retryable
          if (error.response?.status && error.response.status >= 500) {
            throw new NetworkError(`Server error: ${error.response.status} - ${error.response.statusText}`);
          }
        }
        
        // Re-throw unknown errors
        throw error instanceof Error ? error : new Error('Unknown error occurred');
      }
    });
  }

  private async executeWithRetry<T>(operation: (attempt: number) => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation(attempt);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on certain error types
        if (error instanceof APIError && !error.message.includes('Server error')) {
          throw error;
        }
        
        // If this was the last attempt, throw the error
        if (attempt === this.retryConfig.maxAttempts) {
          throw lastError;
        }
        
        // Calculate delay for next attempt
        const delay = this.retryConfig.delays[attempt - 1] || this.retryConfig.delays[this.retryConfig.delays.length - 1];
        
        console.log(`🔄 API request failed (attempt ${attempt}/${this.retryConfig.maxAttempts}), retrying in ${delay}ms...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Test the connection to Pollinations API
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple prompt
      const testPrompt = 'test image';
      await this.generateImage(testPrompt);
      return true;
    } catch (error) {
      console.log('🔍 Pollinations API connection test failed:', error);
      return false;
    }
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      name: 'Pollinations AI',
      url: 'https://pollinations.ai',
      free: true,
      requiresAuth: false,
      rateLimit: 'None (unlimited)',
      regions: 'Global (including UK)',
      features: ['Text-to-image', 'No registration', 'No API key', 'Unlimited usage']
    };
  }
}