import { describe, it, expect } from 'vitest';
import { 
  VincentError, 
  FileError, 
  APIError, 
  NetworkError, 
  ConfigError 
} from '../errors.js';

describe('VincentError', () => {
  it('should create error with correct message and name', () => {
    const error = new VincentError('Test error message');
    
    expect(error.message).toBe('Test error message');
    expect(error.name).toBe('VincentError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(VincentError);
  });

  it('should be throwable', () => {
    expect(() => {
      throw new VincentError('Throwable error');
    }).toThrow('Throwable error');
  });
});

describe('FileError', () => {
  it('should create error with correct message and name', () => {
    const error = new FileError('File not found');
    
    expect(error.message).toBe('File not found');
    expect(error.name).toBe('FileError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(VincentError);
    expect(error).toBeInstanceOf(FileError);
  });

  it('should inherit from VincentError', () => {
    const error = new FileError('Test file error');
    
    expect(error).toBeInstanceOf(VincentError);
  });
});

describe('APIError', () => {
  it('should create error with correct message and name', () => {
    const error = new APIError('API request failed');
    
    expect(error.message).toBe('API request failed');
    expect(error.name).toBe('APIError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(VincentError);
    expect(error).toBeInstanceOf(APIError);
  });

  it('should inherit from VincentError', () => {
    const error = new APIError('Test API error');
    
    expect(error).toBeInstanceOf(VincentError);
  });
});

describe('NetworkError', () => {
  it('should create error with correct message and name', () => {
    const error = new NetworkError('Network connection failed');
    
    expect(error.message).toBe('Network connection failed');
    expect(error.name).toBe('NetworkError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(VincentError);
    expect(error).toBeInstanceOf(NetworkError);
  });

  it('should inherit from VincentError', () => {
    const error = new NetworkError('Test network error');
    
    expect(error).toBeInstanceOf(VincentError);
  });
});

describe('ConfigError', () => {
  it('should create error with correct message and name', () => {
    const error = new ConfigError('Invalid configuration');
    
    expect(error.message).toBe('Invalid configuration');
    expect(error.name).toBe('ConfigError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(VincentError);
    expect(error).toBeInstanceOf(ConfigError);
  });

  it('should inherit from VincentError', () => {
    const error = new ConfigError('Test config error');
    
    expect(error).toBeInstanceOf(VincentError);
  });
});

describe('Error inheritance chain', () => {
  it('should maintain proper inheritance hierarchy', () => {
    const fileError = new FileError('File error');
    const apiError = new APIError('API error');
    const networkError = new NetworkError('Network error');
    const configError = new ConfigError('Config error');

    // All custom errors should inherit from VincentError
    expect(fileError).toBeInstanceOf(VincentError);
    expect(apiError).toBeInstanceOf(VincentError);
    expect(networkError).toBeInstanceOf(VincentError);
    expect(configError).toBeInstanceOf(VincentError);

    // All should be instances of Error
    expect(fileError).toBeInstanceOf(Error);
    expect(apiError).toBeInstanceOf(Error);
    expect(networkError).toBeInstanceOf(Error);
    expect(configError).toBeInstanceOf(Error);
  });
});