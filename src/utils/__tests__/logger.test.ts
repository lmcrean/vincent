import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { logger } from '../logger.js';

describe('logger', () => {
  let consoleSpy: { log: any };
  let originalConsole: any;

  beforeEach(() => {
    originalConsole = console.log;
    consoleSpy = {
      log: vi.fn()
    };
    console.log = consoleSpy.log;
  });

  afterEach(() => {
    console.log = originalConsole;
  });

  describe('info', () => {
    it('should log info message with blue color and info icon', () => {
      const message = 'This is an info message';
      logger.info(message);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        chalk.blue(`ℹ️  ${message}`)
      );
    });

    it('should handle empty string', () => {
      logger.info('');
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        chalk.blue('ℹ️  ')
      );
    });
  });

  describe('warn', () => {
    it('should log warning message with yellow color and warning icon', () => {
      const message = 'This is a warning message';
      logger.warn(message);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        chalk.yellow(`⚠️  ${message}`)
      );
    });
  });

  describe('error', () => {
    it('should log error message with red color and error icon', () => {
      const message = 'This is an error message';
      logger.error(message);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        chalk.red(`❌ ${message}`)
      );
    });
  });

  describe('success', () => {
    it('should log success message with green color and success icon', () => {
      const message = 'This is a success message';
      logger.success(message);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        chalk.green(`✅ ${message}`)
      );
    });
  });

  describe('progress', () => {
    it('should log progress message with cyan color and progress icon', () => {
      const message = 'Processing item 5 of 10';
      logger.progress(message);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        chalk.cyan(`🔄 ${message}`)
      );
    });
  });

  describe('header', () => {
    it('should log header message with bold magenta color and header icon', () => {
      const message = 'Vincent - AI Image Generator';
      logger.header(message);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        chalk.bold.magenta(`🎨 ${message}`)
      );
    });
  });

  describe('message formatting', () => {
    it('should handle messages with special characters', () => {
      const message = 'File: /path/to/file.apkg (100%)';
      logger.info(message);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        chalk.blue(`ℹ️  ${message}`)
      );
    });

    it('should handle multiline messages', () => {
      const message = 'Line 1\nLine 2\nLine 3';
      logger.error(message);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        chalk.red(`❌ ${message}`)
      );
    });

    it('should handle messages with numbers', () => {
      const message = 'Processed 42 cards in 3.14 seconds';
      logger.success(message);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        chalk.green(`✅ ${message}`)
      );
    });
  });

  describe('logger integration', () => {
    it('should provide all required logging methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.success).toBe('function');
      expect(typeof logger.progress).toBe('function');
      expect(typeof logger.header).toBe('function');
    });

    it('should work with all log levels in sequence', () => {
      logger.header('Starting Vincent');
      logger.info('Loading configuration');
      logger.progress('Processing cards');
      logger.warn('Rate limit approaching');
      logger.success('Processing complete');
      logger.error('Failed to save file');

      expect(consoleSpy.log).toHaveBeenCalledTimes(6);
    });
  });
});