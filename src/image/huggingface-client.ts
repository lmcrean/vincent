// Note: @gradio/client is an ES module, so we need to use dynamic import
import axios from 'axios';
import { 
  APIError, 
  NetworkError, 
  NetworkTimeoutError, 
  ConnectionError 
} from '../utils/errors.js';

interface HuggingFaceConfig {
  spaceId: string;
  timeout: number;
  endpoint?: string; // Optional manual endpoint override
}

interface RetryConfig {
  maxAttempts: number;
  delays: number[];
  timeoutMs: number;
}

interface GenerationParams {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  guidance_scale?: number;
  seed?: number;
  randomize_seed?: boolean;
}

/**
 * Hugging Face DALL-E 3 XL LoRA v2 API Client
 * Provides higher quality image generation using Hugging Face Spaces
 * https://huggingface.co/spaces/ehristoforu/dalle-3-xl-lora-v2
 */
export class HuggingFaceClient {
  private config: HuggingFaceConfig;
  private retryConfig: RetryConfig;
  private client: any = null;
  private gradioClientModule: any = null;
  private discoveredEndpoint: string | null = null;

  constructor(retryConfig?: Partial<RetryConfig>) {
    // Default retry configuration
    this.retryConfig = {
      maxAttempts: 3,
      delays: [2000, 5000, 10000], // 2s, 5s, 10s for queue waiting
      timeoutMs: 60000, // 1 minute timeout for image generation
      ...retryConfig
    };
    
    this.config = {
      spaceId: 'ehristoforu/dalle-3-xl-lora-v2',
      timeout: this.retryConfig.timeoutMs,
      endpoint: undefined // Will be discovered automatically
    };
  }

  async generateImage(prompt: string): Promise<Buffer> {
    return this.executeWithRetry(async (attempt: number) => {
      try {
        // Initialize client if not already done
        if (!this.client) {
          // Dynamic import for ES module
          if (!this.gradioClientModule) {
            this.gradioClientModule = await eval('import("@gradio/client")');
          }
          
          console.log(`🤗 Connecting to Hugging Face Space: ${this.config.spaceId}`);
          this.client = await this.gradioClientModule.Client.connect(this.config.spaceId, {
            status_callback: (status: any) => {
              console.log(`🔄 Space status: ${status?.stage || 'unknown'}`);
            }
          });

          // Discover available endpoints
          await this.discoverEndpoint();
        }

        // Prepare generation parameters
        const params: GenerationParams = {
          prompt: this.enhancePromptForEducation(prompt),
          negative_prompt: "deformed, ugly, blurry, low quality, text, watermark, nsfw, inappropriate",
          width: 1024,
          height: 1024,
          guidance_scale: 6,
          seed: Math.floor(Math.random() * 2147483647),
          randomize_seed: true
        };

        console.log(`🎨 Generating DALL-E 3 XL image (attempt ${attempt})`);
        console.log(`🔤 Prompt: "${params.prompt}"`);
        
        // Call the discovered endpoint
        const endpoint = this.discoveredEndpoint || "/predict";
        console.log(`🔗 Using endpoint: ${endpoint}`);
        
        // Based on the discovered API, /run endpoint expects positional parameters:
        // Prompt, Negative prompt, Use negative prompt, Seed, Width, Height, Guidance Scale, Randomize seed
        const result = await this.client.predict(endpoint, [
          params.prompt,                    // Prompt (string)
          params.negative_prompt,           // Negative prompt (string)
          true,                            // Use negative prompt (boolean)
          params.seed,                     // Seed (number)
          params.width,                    // Width (number)
          params.height,                   // Height (number)
          params.guidance_scale,           // Guidance Scale (number)
          params.randomize_seed            // Randomize seed (boolean)
        ]);

        // Debug: Log the raw result structure
        console.log(`🔍 Raw result structure:`, JSON.stringify(result, null, 2));
        
        // Extract image data from result
        const imageData = await this.extractImageData(result);
        
        if (!imageData || imageData.length === 0) {
          throw new APIError('No image data received from Hugging Face Space');
        }

        console.log(`✅ DALL-E 3 XL image generated successfully (${imageData.length} bytes)`);
        return imageData;
        
      } catch (error) {
        // Enhanced error logging for debugging
        console.log('🐛 DEBUG: Hugging Face API Error Details:', {
          message: error instanceof Error ? error.message : 'unknown',
          attempt: attempt
        });
        
        // Handle different types of errors
        if (error instanceof Error) {
          // Queue/capacity errors - retryable
          if (error.message.includes('queue') || error.message.includes('capacity')) {
            throw new NetworkError(`Hugging Face Space is busy (queue full)`);
          }
          
          // Space unavailable - retryable
          if (error.message.includes('offline') || error.message.includes('building')) {
            throw new ConnectionError('Hugging Face Space is currently unavailable');
          }
          
          // Timeout errors - retryable
          if (error.message.includes('timeout') || error.message.includes('aborted')) {
            throw new NetworkTimeoutError(this.retryConfig.timeoutMs / 1000);
          }
          
          // Content policy violations - not retryable
          if (error.message.includes('inappropriate') || error.message.includes('policy')) {
            throw new APIError(`Content policy violation: ${error.message}`);
          }
        }
        
        // Re-throw unknown errors
        throw error instanceof Error ? error : new Error('Unknown error occurred');
      }
    });
  }

  private async discoverEndpoint(): Promise<void> {
    try {
      console.log(`🔍 Discovering API endpoints...`);
      const apiInfo = await this.client.view_api();
      
      console.log(`📋 API Info:`, JSON.stringify(apiInfo, null, 2));
      
      // Look for named endpoints
      const namedEndpoints = apiInfo?.named_endpoints || {};
      const endpoints = Object.keys(namedEndpoints);
      
      console.log(`📍 Available endpoints: ${endpoints.join(', ') || 'none'}`);
      
      if (endpoints.length > 0) {
        // Try to find the best endpoint using common patterns
        let endpoint = endpoints.find(ep => ep.includes('predict')) ||
                      endpoints.find(ep => ep.includes('generate')) ||
                      endpoints.find(ep => ep.includes('run')) ||
                      endpoints.find(ep => ep.includes('infer')) ||
                      endpoints[0]; // fallback to first available
        
        this.discoveredEndpoint = endpoint;
        console.log(`✅ Selected endpoint: ${endpoint}`);
        
        // Log the endpoint parameters for debugging
        const endpointInfo = namedEndpoints[endpoint];
        if (endpointInfo) {
          console.log(`📝 Endpoint parameters:`, endpointInfo.parameters?.map((p: any) => `${p.label}(${p.type})`).join(', '));
        }
      } else {
        console.log(`⚠️ No named endpoints found, will try "/predict"`);
        this.discoveredEndpoint = "/predict";
      }
    } catch (error) {
      console.log(`⚠️ Failed to discover endpoints, using default "/predict":`, error);
      this.discoveredEndpoint = "/predict";
    }
  }

  private async extractImageData(result: any): Promise<Buffer> {
    try {
      // Handle the actual Gradio response format: {type: "data", data: [...], ...}
      console.log(`🔍 Processing result type:`, typeof result, Array.isArray(result));
      
      // The response structure is: {data: [[{image: {url: "...", path: "..."}, caption: null}], seed]}
      if (result?.data && Array.isArray(result.data)) {
        const galleryResult = result.data[0]; // First element is the gallery array
        console.log(`🖼️ Gallery result:`, galleryResult);
        
        if (Array.isArray(galleryResult)) {
          // Gallery is an array of image objects
          for (const imageItem of galleryResult) {
            console.log(`🖼️ Image item:`, imageItem);
            
            if (imageItem?.image?.url) {
              // Direct URL from the response
              const imageUrl = imageItem.image.url;
              console.log(`📥 Fetching image from: ${imageUrl}`);
              
              // Fetch the image
              const response = await axios.get(imageUrl, { 
                responseType: 'arraybuffer',
                timeout: 30000 
              });
              
              return Buffer.from(response.data);
            }
            
            if (imageItem?.image?.path) {
              // Convert relative path to absolute URL
              const imageUrl = `https://${this.config.spaceId.replace('/', '-')}.hf.space/file=${imageItem.image.path}`;
              console.log(`📥 Fetching image from path: ${imageUrl}`);
              
              // Fetch the image
              const response = await axios.get(imageUrl, { 
                responseType: 'arraybuffer',
                timeout: 30000 
              });
              
              return Buffer.from(response.data);
            }
          }
        }
      }
      
      // Handle array result (fallback for other formats)
      if (Array.isArray(result)) {
        // First element should be the Gallery result
        const galleryResult = result[0];
        console.log(`🖼️ Gallery result:`, galleryResult);
        
        if (Array.isArray(galleryResult)) {
          // Gallery is an array of image objects
          for (const imageItem of galleryResult) {
            console.log(`🖼️ Image item:`, imageItem);
            
            if (imageItem?.image) {
              // Try to get image URL or path
              let imageUrl = imageItem.image;
              
              // If it's a relative path, make it absolute
              if (imageUrl && !imageUrl.startsWith('http')) {
                // Convert relative path to absolute URL
                imageUrl = `https://${this.config.spaceId.replace('/', '-')}.hf.space/file=${imageUrl}`;
              }
              
              console.log(`📥 Fetching image from: ${imageUrl}`);
              
              // Fetch the image
              const response = await axios.get(imageUrl, { 
                responseType: 'arraybuffer',
                timeout: 30000 
              });
              
              return Buffer.from(response.data);
            }
          }
        }
      }
      
      // Handle legacy formats for compatibility
      if (result?.data && Array.isArray(result.data)) {
        // Look for image data in the result array
        for (const item of result.data) {
          if (typeof item === 'string' && item.startsWith('data:image/')) {
            // Base64 encoded image
            const base64Data = item.split(',')[1];
            return Buffer.from(base64Data, 'base64');
          }
          
          if (item?.url && typeof item.url === 'string') {
            // Image URL - fetch it
            console.log(`📥 Fetching image from URL: ${item.url}`);
            const response = await axios.get(item.url, { 
              responseType: 'arraybuffer',
              timeout: 30000 
            });
            return Buffer.from(response.data);
          }
        }
      }
      
      // Direct result cases
      if (typeof result === 'string' && result.startsWith('data:image/')) {
        const base64Data = result.split(',')[1];
        return Buffer.from(base64Data, 'base64');
      }
      
      throw new APIError('Unable to extract image data from Hugging Face response');
      
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(`Failed to process Hugging Face response: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private enhancePromptForEducation(prompt: string): string {
    // Enhance prompt for better educational content
    const educationalKeywords = [
      'educational illustration',
      'clear and detailed',
      'suitable for learning',
      'professional diagram style'
    ];
    
    // Check if prompt already contains educational context
    const hasEducationalContext = educationalKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (!hasEducationalContext) {
      return `Educational illustration: ${prompt}. Clean, clear, and suitable for study materials.`;
    }
    
    return prompt;
  }

  private async executeWithRetry<T>(operation: (attempt: number) => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation(attempt);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on certain error types
        if (error instanceof APIError && !error.message.includes('queue') && !error.message.includes('unavailable')) {
          throw error;
        }
        
        // If this was the last attempt, throw the error
        if (attempt === this.retryConfig.maxAttempts) {
          throw lastError;
        }
        
        // Calculate delay for next attempt
        const delay = this.retryConfig.delays[attempt - 1] || this.retryConfig.delays[this.retryConfig.delays.length - 1];
        
        console.log(`🔄 Hugging Face request failed (attempt ${attempt}/${this.retryConfig.maxAttempts}), retrying in ${delay}ms...`);
        console.log(`💡 Reason: ${lastError.message}`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Test the connection to Hugging Face Space
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple prompt
      const testPrompt = 'simple test image';
      await this.generateImage(testPrompt);
      return true;
    } catch (error) {
      console.log('🔍 Hugging Face Space connection test failed:', error);
      return false;
    }
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      name: 'Hugging Face DALL-E 3 XL LoRA v2',
      url: 'https://huggingface.co/spaces/ehristoforu/dalle-3-xl-lora-v2',
      free: true,
      requiresAuth: false,
      rateLimit: 'Queue-based (may have waiting times)',
      regions: 'Global',
      features: ['DALL-E 3 quality', 'High resolution', 'Educational optimized', 'Free usage']
    };
  }

  /**
   * Clean up resources
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      // Gradio client doesn't have explicit disconnect, just clear reference
      this.client = null;
      console.log('🔌 Disconnected from Hugging Face Space');
    }
  }
}