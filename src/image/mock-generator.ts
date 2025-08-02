import fs from 'fs-extra';
import path from 'path';
import { 
  ConnectionError, 
  NetworkTimeoutError, 
  RateLimitError, 
  APIError 
} from '../utils/errors.js';

interface MockFailureConfig {
  failureMode?: 'none' | 'connection' | 'timeout' | 'ratelimit' | 'server' | 'random';
  failureRate?: number; // 0-1, probability of failure
  maxAttempts?: number; // for testing retry logic
}

export class MockImageGenerator {
  private failureConfig: MockFailureConfig;
  private attemptCounts: Map<string, number> = new Map();

  constructor(failureConfig: MockFailureConfig = {}) {
    this.failureConfig = {
      failureMode: 'none',
      failureRate: 0,
      maxAttempts: 1,
      ...failureConfig
    };
    
    console.log('🧪 MOCK MODE ACTIVATED');
    console.log('Using placeholder images for testing');
    
    if (this.failureConfig.failureMode !== 'none') {
      console.log(`🎭 Network failure simulation: ${this.failureConfig.failureMode} (rate: ${this.failureConfig.failureRate})`);
    } else {
      console.log('No external API calls will be made');
    }
  }

  async generateMockImage(cardId: number, question: string, outputDir: string): Promise<string> {
    // Simulate network failures for testing retry logic
    await this.simulateNetworkFailure(cardId, question);
    
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
  
  private async simulateNetworkFailure(cardId: number, question: string): Promise<void> {
    if (this.failureConfig.failureMode === 'none') {
      return; // No failures to simulate
    }
    
    const requestKey = `${cardId}-${question}`;
    const currentAttempt = (this.attemptCounts.get(requestKey) || 0) + 1;
    this.attemptCounts.set(requestKey, currentAttempt);
    
    // Don't fail if we've reached the max attempts (to eventually succeed)
    if (currentAttempt >= (this.failureConfig.maxAttempts || 1)) {
      console.log(`✅ Mock: Request succeeded after ${currentAttempt} attempts`);
      return;
    }
    
    // Determine if we should fail this attempt
    const shouldFail = this.failureConfig.failureMode === 'random' 
      ? Math.random() < (this.failureConfig.failureRate || 0.5)
      : true;
      
    if (!shouldFail) {
      return;
    }
    
    // Simulate the specified failure type
    const failureType = this.failureConfig.failureMode === 'random' 
      ? this.getRandomFailureType()
      : this.failureConfig.failureMode;
      
    console.log(`🚨 Mock: Simulating ${failureType} failure (attempt ${currentAttempt})`);
    
    switch (failureType) {
      case 'connection':
        throw new ConnectionError('Mock: Could not connect to image generation service');
        
      case 'timeout':
        // Simulate a timeout by waiting then throwing
        await new Promise(resolve => setTimeout(resolve, 100));
        throw new NetworkTimeoutError(30);
        
      case 'ratelimit':
        throw new RateLimitError(2); // Suggest 2 second retry
        
      case 'server':
        throw new APIError('Mock: Server error: 500');
        
      default:
        throw new ConnectionError('Mock: Unknown network error');
    }
  }
  
  private getRandomFailureType(): string {
    const types = ['connection', 'timeout', 'ratelimit', 'server'];
    return types[Math.floor(Math.random() * types.length)];
  }
  
  // Method to enable network failure testing
  public setFailureMode(failureMode: MockFailureConfig['failureMode'], failureRate?: number): void {
    this.failureConfig.failureMode = failureMode;
    if (failureRate !== undefined) {
      this.failureConfig.failureRate = failureRate;
    }
    
    console.log(`🎭 Mock failure mode updated: ${failureMode} (rate: ${this.failureConfig.failureRate})`);
  }
  
  // Reset attempt counts for fresh testing
  public resetAttempts(): void {
    this.attemptCounts.clear();
    console.log('🔄 Mock: Attempt counts reset');
  }
}