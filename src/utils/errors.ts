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