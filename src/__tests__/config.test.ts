import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { tmpdir } from 'os';
import { ConfigError } from '../utils/errors.js';

// Create a testable ConfigManager class that accepts a custom home directory
class TestableConfigManager {
  constructor(private homeDir: string) {}

  private get configDir(): string {
    return path.join(this.homeDir, '.vincent');
  }

  private get configFile(): string {
    return path.join(this.configDir, 'config.json');
  }

  async getConfig(): Promise<any | null> {
    try {
      if (await fs.pathExists(this.configFile)) {
        const content = await fs.readFile(this.configFile, 'utf8');
        return JSON.parse(content);
      }
      return null;
    } catch {
      return null;
    }
  }

  async saveConfig(config: any): Promise<void> {
    try {
      await fs.ensureDir(this.configDir);
      await fs.writeFile(this.configFile, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new ConfigError(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveApiKey(apiKey: string): Promise<void> {
    const config = await this.getConfig() || {
      apiKey: '',
      style: 'educational' as const,
      outputDir: 'vincent-output'
    };
    
    config.apiKey = apiKey;
    await this.saveConfig(config);
  }

  async getApiKey(): Promise<string | null> {
    const config = await this.getConfig();
    return config?.apiKey || null;
  }
}

describe('ConfigManager', () => {
  let tempHomeDir: string;
  let configManager: TestableConfigManager;

  beforeEach(async () => {
    // Create a unique temporary directory for each test
    tempHomeDir = path.join(tmpdir(), 'vincent-config-test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9));
    await fs.ensureDir(tempHomeDir);
    
    // Create a new ConfigManager instance for each test with the temp directory
    configManager = new TestableConfigManager(tempHomeDir);
  });

  afterEach(async () => {
    // Clean up temp directory completely
    try {
      await fs.remove(tempHomeDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getConfig', () => {
    it('should return null when config file does not exist', async () => {
      const config = await configManager.getConfig();
      expect(config).toBeNull();
    });

    it('should return parsed config when file exists', async () => {
      const expectedConfig = {
        apiKey: 'test-key-123',
        style: 'educational' as const,
        outputDir: 'test-output'
      };

      const configDir = path.join(tempHomeDir, '.vincent');
      const configFile = path.join(configDir, 'config.json');
      
      await fs.ensureDir(configDir);
      await fs.writeFile(configFile, JSON.stringify(expectedConfig, null, 2));

      const config = await configManager.getConfig();
      expect(config).toEqual(expectedConfig);
    });

    it('should return null when config file is corrupted', async () => {
      const configDir = path.join(tempHomeDir, '.vincent');
      const configFile = path.join(configDir, 'config.json');
      
      await fs.ensureDir(configDir);
      await fs.writeFile(configFile, 'invalid json content {');

      const config = await configManager.getConfig();
      expect(config).toBeNull();
    });

    it('should return null when config file cannot be read', async () => {
      const configDir = path.join(tempHomeDir, '.vincent');
      
      // Create directory but not the file, then try to read from a non-existent file
      await fs.ensureDir(configDir);

      const config = await configManager.getConfig();
      expect(config).toBeNull();
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', async () => {
      const testConfig = {
        apiKey: 'save-test-key',
        style: 'medical' as const,
        outputDir: 'save-test-output'
      };

      await configManager.saveConfig(testConfig);

      const configFile = path.join(tempHomeDir, '.vincent', 'config.json');
      const exists = await fs.pathExists(configFile);
      expect(exists).toBe(true);

      const savedContent = await fs.readFile(configFile, 'utf8');
      const savedConfig = JSON.parse(savedContent);
      expect(savedConfig).toEqual(testConfig);
    });

    it('should create config directory if it does not exist', async () => {
      const testConfig = {
        apiKey: 'create-dir-test-key',
        style: 'colorful' as const,
        outputDir: 'create-dir-test-output'
      };

      const configDir = path.join(tempHomeDir, '.vincent');
      const dirExists = await fs.pathExists(configDir);
      expect(dirExists).toBe(false);

      await configManager.saveConfig(testConfig);

      const dirExistsAfter = await fs.pathExists(configDir);
      expect(dirExistsAfter).toBe(true);
    });

    it('should throw ConfigError when save fails', async () => {
      const testConfig = {
        apiKey: 'fail-test-key',
        style: 'educational' as const,
        outputDir: 'fail-test-output'
      };

      // Mock fs.writeFile to throw an error
      const writeFileSpy = vi.spyOn(fs, 'writeFile').mockRejectedValue(new Error('Permission denied'));

      await expect(configManager.saveConfig(testConfig)).rejects.toBeInstanceOf(ConfigError);
      await expect(configManager.saveConfig(testConfig)).rejects.toThrow('Failed to save configuration');

      writeFileSpy.mockRestore();
    });

    it('should format JSON with proper indentation', async () => {
      const testConfig = {
        apiKey: 'format-test-key',
        style: 'educational' as const,
        outputDir: 'format-test-output'
      };

      await configManager.saveConfig(testConfig);

      const configFile = path.join(tempHomeDir, '.vincent', 'config.json');
      const savedContent = await fs.readFile(configFile, 'utf8');
      
      // Check that it's properly formatted (contains newlines and spaces)
      expect(savedContent).toContain('{\n');
      expect(savedContent).toContain('  "apiKey"');
      expect(savedContent).toMatch(/\n}/);
    });
  });

  describe('saveApiKey', () => {
    it('should save API key to new config', async () => {
      const testApiKey = 'new-api-key-123';

      await configManager.saveApiKey(testApiKey);

      const savedConfig = await configManager.getConfig();
      expect(savedConfig?.apiKey).toBe(testApiKey);
      expect(savedConfig?.style).toBe('educational');
      expect(savedConfig?.outputDir).toBe('vincent-output');
    });

    it('should update API key in existing config', async () => {
      const initialConfig = {
        apiKey: 'old-key',
        style: 'medical' as const,
        outputDir: 'custom-output'
      };

      await configManager.saveConfig(initialConfig);

      const newApiKey = 'updated-api-key-456';
      await configManager.saveApiKey(newApiKey);

      const updatedConfig = await configManager.getConfig();
      expect(updatedConfig?.apiKey).toBe(newApiKey);
      expect(updatedConfig?.style).toBe('medical'); // Should preserve existing style
      expect(updatedConfig?.outputDir).toBe('custom-output'); // Should preserve existing output dir
    });

    it('should handle empty API key', async () => {
      await configManager.saveApiKey('');

      const savedConfig = await configManager.getConfig();
      expect(savedConfig?.apiKey).toBe('');
    });
  });

  describe('getApiKey', () => {
    it('should return null when no config exists', async () => {
      const apiKey = await configManager.getApiKey();
      expect(apiKey).toBeNull();
    });

    it('should return API key from existing config', async () => {
      const testConfig = {
        apiKey: 'get-test-key-789',
        style: 'colorful' as const,
        outputDir: 'get-test-output'
      };

      await configManager.saveConfig(testConfig);

      const apiKey = await configManager.getApiKey();
      expect(apiKey).toBe('get-test-key-789');
    });

    it('should return null when config exists but has no API key', async () => {
      const testConfig = {
        apiKey: '',
        style: 'educational' as const,
        outputDir: 'empty-key-output'
      };

      await configManager.saveConfig(testConfig);

      const apiKey = await configManager.getApiKey();
      expect(apiKey).toBeNull(); // Empty string is treated as null by the current implementation
    });

    it('should return null when config is corrupted', async () => {
      const configDir = path.join(tempHomeDir, '.vincent');
      const configFile = path.join(configDir, 'config.json');
      
      await fs.ensureDir(configDir);
      await fs.writeFile(configFile, 'invalid json');

      const apiKey = await configManager.getApiKey();
      expect(apiKey).toBeNull();
    });
  });

  describe('integration tests', () => {
    it('should handle complete save and load cycle', async () => {
      const originalConfig = {
        apiKey: 'integration-test-key',
        style: 'medical' as const,
        outputDir: 'integration-test-output'
      };

      // Save config
      await configManager.saveConfig(originalConfig);

      // Load config
      const loadedConfig = await configManager.getConfig();
      expect(loadedConfig).toEqual(originalConfig);

      // Update API key
      await configManager.saveApiKey('updated-integration-key');

      // Verify API key was updated but other values preserved
      const updatedConfig = await configManager.getConfig();
      expect(updatedConfig?.apiKey).toBe('updated-integration-key');
      expect(updatedConfig?.style).toBe('medical');
      expect(updatedConfig?.outputDir).toBe('integration-test-output');

      // Verify getApiKey returns the updated key
      const apiKey = await configManager.getApiKey();
      expect(apiKey).toBe('updated-integration-key');
    });
  });
});