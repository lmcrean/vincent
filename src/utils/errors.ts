export class VincentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VincentError';
  }
}

export class FileError extends VincentError {
  constructor(message: string) {
    super(message);
    this.name = 'FileError';
  }
}

export class APIError extends VincentError {
  constructor(message: string) {
    super(message);
    this.name = 'APIError';
  }
}

export class NetworkError extends VincentError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ConfigError extends VincentError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

// Network-specific error types for Iteration 2
export class RateLimitError extends APIError {
  public retryAfter?: number;
  
  constructor(retryAfter?: number) {
    const message = retryAfter 
      ? `Rate limit exceeded, retry after ${retryAfter}s`
      : 'Rate limit exceeded. Please try again later.';
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class NetworkTimeoutError extends NetworkError {
  public timeout: number;
  
  constructor(timeout: number) {
    super(`Request timed out after ${timeout}s`);
    this.name = 'NetworkTimeoutError';
    this.timeout = timeout;
  }
}

export class ConnectionError extends NetworkError {
  constructor(message: string = 'Could not connect to image generation service') {
    super(message);
    this.name = 'ConnectionError';
  }
}

export class RetryableError extends VincentError {
  public isRetryable: boolean = true;
  public attempt: number;
  public maxAttempts: number;
  
  constructor(message: string, attempt: number, maxAttempts: number) {
    super(`${message} (attempt ${attempt}/${maxAttempts})`);
    this.name = 'RetryableError';
    this.attempt = attempt;
    this.maxAttempts = maxAttempts;
  }
}